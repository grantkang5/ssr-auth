import { Mutation, Resolver, Arg, UseMiddleware, Ctx, Int } from 'type-graphql';
import { isAuth } from '../services/auth/isAuth';
import { Project } from '../entity/Project';
import { MyContext } from '../services/context';
import { User } from '../entity/User';

@Resolver()
export class ProjectResolver {
  @Mutation(() => Project)
  @UseMiddleware(isAuth)
  async createProject(
    @Arg('name') name: string,
    @Arg('desc') desc: string,
    @Ctx() { payload }: MyContext
  ) {
    try {
      const user = await User.findOne({ where: { id: payload!.userId } });
      const project = await Project.create({
        name,
        desc,
        owner: user
      });
      // project.members = [user!];
      return await project.save();
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async updateProject(
    @Arg('id', () => Int) id: number,
    @Arg('name', { nullable: true }) name?: string,
    @Arg('desc', { nullable: true }) desc?: string
  ) {
    try {
      const project = await Project.findOne({ where: { id } });
      if (!project) {
        throw new Error('Project does not exist');
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
}
