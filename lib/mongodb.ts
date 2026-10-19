import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb+srv://rajat70184_db_user:K9z3dDPFALKiaQlq@cluster0.qtq2jmz.mongodb.net/prajnaa_crm?retryWrites=true&w=majority";
const options = { serverSelectionTimeoutMS: 2500, connectTimeoutMS: 2500 };

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable to preserve the client across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, instantiate client per standard serverless pooling
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase(dbName: string = "prajnaa_crm"): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
