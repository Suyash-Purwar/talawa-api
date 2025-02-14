import "dotenv/config";
import { Document, Types } from "mongoose";
import {
  Interface_User,
  User,
  Organization,
  Interface_Organization,
} from "../../../src/lib/models";
import { MutationRemoveMemberArgs } from "../../../src/generated/graphqlCodegen";
import { connect, disconnect } from "../../../src/db";
import { removeMember as removeMemberResolver } from "../../../src/lib/resolvers/Mutation/removeMember";
import {
  MEMBER_NOT_FOUND,
  ORGANIZATION_NOT_FOUND,
  USER_NOT_AUTHORIZED,
  USER_NOT_FOUND,
} from "../../../src/constants";
import { nanoid } from "nanoid";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

let testUsers: (Interface_User & Document<any, any, Interface_User>)[];
let testOrganization: Interface_Organization &
  Document<any, any, Interface_Organization>;

beforeAll(async () => {
  await connect();

  testUsers = await User.insertMany([
    {
      email: `email${nanoid().toLowerCase()}@gmail.com`,
      password: "password",
      firstName: "firstName",
      lastName: "lastName",
      appLanguageCode: "en",
    },
    {
      email: `email${nanoid().toLowerCase()}@gmail.com`,
      password: "password",
      firstName: "firstName",
      lastName: "lastName",
      appLanguageCode: "en",
    },
    {
      email: `email${nanoid().toLowerCase()}@gmail.com`,
      password: "password",
      firstName: "firstName",
      lastName: "lastName",
      appLanguageCode: "en",
    },
  ]);

  testOrganization = await Organization.create({
    name: "name",
    description: "description",
    isPublic: true,
    creator: testUsers[1]._id,
    admins: [testUsers[0]._id],
    members: [testUsers[0]._id, testUsers[1]._id],
  });

  await User.updateOne(
    {
      _id: testUsers[0]._id,
    },
    {
      $push: {
        createdOrganizations: testOrganization._id,
        adminFor: testOrganization._id,
        joinedOrganizations: testOrganization._id,
      },
    }
  );

  await User.updateOne(
    {
      _id: testUsers[1]._id,
    },
    {
      $push: {
        adminFor: testOrganization._id,
        joinedOrganizations: testOrganization._id,
      },
    }
  );

  await User.updateOne(
    {
      _id: testUsers[2]._id,
    },
    {
      $push: {
        joinedOrganizations: testOrganization._id,
      },
    }
  );
});

afterAll(async () => {
  await disconnect();
});

describe("resolvers -> Mutation -> removeMember", () => {
  it(`throws NotFoundError if no organization exists with _id === args.data.organizationId`, async () => {
    try {
      const args: MutationRemoveMemberArgs = {
        data: {
          organizationId: Types.ObjectId().toString(),
          userIds: [],
        },
      };

      const context = {
        userId: testUsers[0].id,
      };

      await removeMemberResolver?.({}, args, context);
    } catch (error: any) {
      expect(error.message).toEqual(ORGANIZATION_NOT_FOUND);
    }
  });

  it(`throws UnauthorizedError if current user with _id === context.userId is
  not an admin of the organization with _id === args.data.organizationId`, async () => {
    try {
      const args: MutationRemoveMemberArgs = {
        data: {
          organizationId: testOrganization.id,
          userIds: [],
        },
      };

      const context = {
        userId: testUsers[2].id,
      };

      await removeMemberResolver?.({}, args, context);
    } catch (error: any) {
      expect(error.message).toEqual(USER_NOT_AUTHORIZED);
    }
  });

  it(`throws Error if no user exists for one of the ids in args.data.userIds`, async () => {
    try {
      const args: MutationRemoveMemberArgs = {
        data: {
          organizationId: testOrganization.id,
          userIds: [Types.ObjectId().toString(), Types.ObjectId().toString()],
        },
      };

      const context = {
        userId: testUsers[0].id,
      };

      await removeMemberResolver?.({}, args, context);
    } catch (error: any) {
      expect(error.message).toEqual(USER_NOT_FOUND);
    }
  });

  it(`throws Error if user with one of the ids in args.data.userIds is not
  a member of organization with _id === args.data.organizationId`, async () => {
    try {
      const args: MutationRemoveMemberArgs = {
        data: {
          organizationId: testOrganization.id,
          userIds: [testUsers[2].id],
        },
      };

      const context = {
        userId: testUsers[0].id,
      };

      await removeMemberResolver?.({}, args, context);
    } catch (error: any) {
      expect(error.message).toEqual(MEMBER_NOT_FOUND);
    }
  });

  it(`throws Error if user with one of the ids in args.data.userIds is an admin
  of organization with _id === args.data.organizationId`, async () => {
    try {
      const args: MutationRemoveMemberArgs = {
        data: {
          organizationId: testOrganization.id,
          userIds: [testUsers[0].id],
        },
      };

      const context = {
        userId: testUsers[0].id,
      };

      await removeMemberResolver?.({}, args, context);
    } catch (error: any) {
      expect(error.message).toEqual(
        "Administrators cannot remove members who are also Administrators"
      );
    }
  });

  it(`throws Error if user with one of the ids in args.data.userIds is the creator
  of organization with _id === args.data.organizationId`, async () => {
    try {
      const args: MutationRemoveMemberArgs = {
        data: {
          organizationId: testOrganization.id,
          userIds: [testUsers[1].id],
        },
      };

      const context = {
        userId: testUsers[0].id,
      };

      await removeMemberResolver?.({}, args, context);
    } catch (error: any) {
      expect(error.message).toEqual(
        "Administrators cannot remove the creator of the organization from the organization"
      );
    }
  });

  it(`removes the the users with ids === args.data.userIds from members list of
  organization with _id === args.data.organizationId and returns the updated organization`, async () => {
    await Organization.updateOne(
      {
        _id: testOrganization._id,
      },
      {
        $set: {
          creator: testUsers[0]._id,
        },
      }
    );

    const args: MutationRemoveMemberArgs = {
      data: {
        organizationId: testOrganization.id,
        userIds: [testUsers[1].id],
      },
    };

    const context = {
      userId: testUsers[0].id,
    };

    const removeMemberPayload = await removeMemberResolver?.({}, args, context);

    const testRemoveMemberPayload = await Organization.findOne({
      _id: testOrganization._id,
    }).lean();

    expect(removeMemberPayload).toEqual(testRemoveMemberPayload);

    const testUpdatedUser = await User.findOne({
      _id: testUsers[1]._id,
    })
      .select("joinedOrganizations")
      .lean();

    expect(testUpdatedUser).toEqual(
      expect.objectContaining({
        joinedOrganizations: [],
      })
    );
  });
});
