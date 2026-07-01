const prefix = 'logs_';

const collections = db.getCollectionNames().filter((name) => typeof name === 'string' && name.startsWith(prefix));

collections.sort().forEach((collectionName) => {
  const result = db.getCollection(collectionName).deleteMany({});
  printjson({ collection: collectionName, deletedCount: result.deletedCount });
});
