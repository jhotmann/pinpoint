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

  static async create(data, user, deviceId) {
    const location = new Location({
      userId: user._id,
      username: user.username,
      deviceId,
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
    const locations = [];
    (await Location.find({ userId }).sort({ createdAt: -1 })).forEach((loc) => {
      if (!locations.find((location) => location.deviceId === loc.deviceId)) {
        locations.push(loc);
      }
    });
    return locations;
  }
}

module.exports.Location = Location;
