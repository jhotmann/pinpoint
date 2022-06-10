const async = require('async');
const path = require('path');
const db = require('../');

const { Model } = require('nedb-models');

class Base extends Model {
  static async get(_id) {
    const one = await this.findOne({ _id });
    return one;
  }

  static async getAll() {
    const all = await this.find();
    return all;
  }
}

class User extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'users.db'),
      timestampData: true,
    };
  }
}

class Group extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'groups.db'),
      timestampData: true,
    };
  }
}

class Device extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'devices.db'),
      timestampData: true,
    };
  }
}

class Location extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'locations.db'),
      timestampData: true,
    };
  }
}

class Registration extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'registrations.db'),
      timestampData: true,
    };
  }
}

async function up() {
	const allUsers = await User.getAll();

  // Create users
  await async.eachSeries(allUsers, async (u) => {
    await db.User.create({
      uuid: u._id,
      username: u.username,
      passwordHash: u.passwordHash,
      isAdmin: u.isAdmin || false,
      notificationTarget: u.notificationTarget || null,
      helpDismissed: u.helpDismissed || false
    });
  });

  // Create friendships
  await async.eachSeries(allUsers, async (u) => {
    const user = await db.User.getByUuid(u._id);
    await async.eachSeries(u.friends, async (f) => {
      const friend = await db.User.getByUsername(f);
      if (user && friend)
        await db.Friend.create({ userId: user.id, friendId: friend.id });
    });
  });

  const allGroups = await Group.getAll();

  // Create groups
  await async.eachSeries(allGroups, async (g) => {
    const admin = await db.User.getByUuid(g.adminId);
    const group = await db.Group.create({
      uuid: g._id,
      name: g.name,
      adminId: admin.id
    });
    // Map group members
    await async.eachSeries(g.members, async (m) => {
      const member = await db.User.getByUuid(m.userId);
      if (group && member) {
        await db.GroupMembers.create({
          groupId: group.id,
          userId: member.id,
          accepted: m.accepted
        });
      }
    });
  });

  const allDevices = await Device.getAll();

  // Create devices
  await async.eachSeries(allDevices, async (d) => {
    const user = await db.User.getByUuid(d.userId);
    const deviceData = {
      uuid: d._id,
      name: d.name,
      initials: d.initials,
      userId: user.id
    };
    if (d?.card?.face) deviceData.avatar = d.card.face;
    await db.Device.create(deviceData);
  });

  const allLocations = await Location.getAll();

  // Create locations
  await async.eachSeries(allLocations, async (l) => {
    const device = await db.Device.getByUuid(l.deviceId);
    await db.Location.create({
      userId: device.userId,
      deviceId: device.id,
      data: l.data
    });
  });

  const allRegistrations = await Registration.getAll();
  
  // Create registrations
  await async.eachSeries(allRegistrations, async (r) => {
    await db.Registration.create({
      uuid: r.guid,
      expiration: r.expiration,
      used: r.used
    });
  });
}

async function down() {}

module.exports = { up, down };