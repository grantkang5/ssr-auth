import {
  Mutation,
  Resolver,
  Arg,
  UseMiddleware,
  Ctx,
  ID,
  Query
} from "type-graphql";
import { isAuth } from "../services/auth/isAuth";
import { Project } from "../entity/Project";
import { MyContext } from "../services/context";
import { User } from "../entity/User";
import { rateLimit } from "../services/rate-limit";
import { createBaseResolver } from "./BaseResolver";
import { v4 } from "uuid";
import { redis } from "../services/redis";
import { projectInviteEmail } from "../services/emails/projectInviteEmail";
import { transporter } from "../services/emails/transporter";

const ProjectBaseResolver = createBaseResolver("Project", Project);

@Resolver()
export class ProjectResolver extends ProjectBaseResolver {
  @Query(() => Project)
  @UseMiddleware(isAuth)
  async getUserProject(
    @Arg("id", () => ID) id: number,
    @Ctx() { payload }: MyContext
  ) {
    try {
      const project = await Project.createQueryBuilder("project")
        .innerJoinAndSelect("project.members", "user", "user.id = :userId", {
          userId: payload!.userId
        })
        .where("project.id = :projectId", { projectId: id })
        .getOne();
      if (!project) {
        throw new Error(
          `This project doesn't exist or you don't have access to it`
        );
      }
      return project;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Query(() => [Project])
  @UseMiddleware(isAuth)
  async getUserProjects(@Ctx() { payload }: MyContext) {
    try {
      const user = await User.findOne({
        relations: ["projects"],
        where: { id: payload!.userId }
      });
      if (!user) throw new Error(`This user doesn't exist`)
      return user.projects
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => Project)
  @UseMiddleware(isAuth)
  async createProject(
    @Ctx() { payload }: MyContext,
    @Arg("name") name: string,
    @Arg("desc", { nullable: true }) desc?: string
  ) {
    try {
      const user = await User.findOne({ where: { id: payload!.userId } });
      const project = await Project.create({
        name,
        desc,
        owner: user
      });
      project.members = [user!];
      return await project.save();
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async updateProject(
    @Arg("id", () => ID) id: number,
    @Arg("name", { nullable: true }) name?: string,
    @Arg("desc", { nullable: true }) desc?: string
  ) {
    try {
      const project = await Project.findOne({ where: { id } });
      if (!project) {
        throw new Error("Project does not exist");
      }
      if (name && project.name !== name) {
        project.name = name;
      }

      if (desc && project.desc !== desc) {
        project.desc = desc;
      }

      await project.save();
      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => String)
  @UseMiddleware(isAuth, rateLimit(10))
  async sendProjectInviteLink(
    @Arg("projectId", () => ID) projectId: number,
    @Arg("email") email: string,
    @Ctx() { payload }: MyContext
  ) {
    try {
      const me = await User.findOne({ where: { id: payload!.userId } });
      const project = await Project.findOne({ where: { id: projectId } });
      if (!project) throw new Error("Project doesn't exist");

      const invitationLink = v4();
      await redis.hmset(`project-invite-${email}`, {
        id: projectId,
        link: invitationLink
      });
      await redis.expire(`project-invite-${email}`, 3600);
      transporter.sendMail(
        projectInviteEmail({
          sender: me!.username,
          email,
          projectName: project.name,
          link: invitationLink
        })
      );

      return invitationLink;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async acceptProjectInviteLink(
    @Arg("email") email: string,
    @Arg("projectInviteLink") projectInviteLink: string,
    @Ctx() { payload }: MyContext
  ) {
    try {
      const { link: storedLink, id: projectId } = await redis.hgetall(
        `project-invite-${email}`
      );
      if (storedLink !== projectInviteLink) {
        throw new Error("This link has expired");
      }

      const user = await User.findOne({ id: payload!.userId });
      if (!user) throw new Error(`This user doesn't exist`);
      const project = await Project.findOne({
        relations: ["members"],
        where: { id: projectId }
      });
      if (!project) throw new Error(`This project doesn't exist`);
      project.members = [...project.members, user];
      await project.save();
      await redis.del(`project-invite-${email}`);
      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }
}
