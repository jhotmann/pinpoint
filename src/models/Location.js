const path = require('path');
const { Base } = require('./Base');

/*
{
  _id: "string",
  userId: "string"
  username: "string",
  data: Object
}
*/

class Location extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'locations.db'),
      timestampData: true,
    };
  }

  static async create(data, user) {
    const location = new Location({
      userId: user._id,
      username: user.username,
      data
    });
    await location.save();
    return location;
  }

  static async getByUserId(userId) {
    const locations = await Location.find({ userId });
    return locations;
  }

  static async getLastByUserId(userId) {
    const location = await Location.find({ userId }).sort({ createdAt: -1 }).limit(1);
    if (location.length === 1) return location[0];
    return null;
  }
}

module.exports.Location = Location;
