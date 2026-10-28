// If the replica set has already been initialized, this command is harmless to rerun manually.
try {
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }]
  });
} catch (e) {
  print("Replica set may already be initialized: " + e);
}
