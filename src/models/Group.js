const path = require('path');
const { Base } = require('./Base');

/*
{
  _id: "string",
  name: "string",
  adminId: "string",
  members: [{
    userId: "string",
    username: "string",
    accepted: bool
  }],
  createdAt: Date,
  updatedAt: Date,
}
*/

class Group extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'groups.db'),
      timestampData: true,
    };
  }

  static async create(name, user) {
    const existing = await Group.findOne({ name });
    if (existing) return null;
    const group = new Group({
      name,
      adminId: user._id,
      members: [{ userId: user._id, username: user.username, accepted: true }],
    });
    await group.save();
    return group;
  }

  async invite(user) {
    this.members.push({ userId: user._id, username: user.username, accepted: false });
    const group = await this.save();
    return group;
  }

  async accept(userId) {
    this.members = this.members.map((member) => {
      if (member.userId === userId) member.accepted = true;
      return member;
    });
    const group = await this.save();
    return group;
  }

  async leave(userId) {
    this.members = this.members.filter((member) => member.userId !== userId);
    const group = await this.save();
    return group;
  }

  static async getByUserId(userId) {
    const groups = await Group.find({ $or: [{ adminId: userId }, { members: { $elemMatch: { userId } } }] });
    return groups;
  }
}

module.exports.Group = Group;
