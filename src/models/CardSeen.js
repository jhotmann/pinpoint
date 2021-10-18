const path = require('path');
const { Base } = require('./Base');

/*
{
  _id: "string",
  deviceId: "string",
  seerId: "string",
  seen: bool
}
*/

class CardSeen extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'cardseen.db'),
      timestampData: true,
    };
  }

  static async see(deviceId, seerId) {
    let entry;
    const existing = await CardSeen.findOne({ deviceId, seerId });
    if (existing) {
      existing.seen = true;
      entry = await existing.save();
    } else {
      entry = new CardSeen({ deviceId, seerId, seen: true });
      await entry.save();
    }
    return entry;
  }

  static async unsee(deviceId, seerId) {
    const existing = await CardSeen.findOne({ deviceId, seerId });
    if (!existing) return null;
    existing.seen = false;
    await existing.save();
    return existing;
  }
}

module.exports.CardSeen = CardSeen;
