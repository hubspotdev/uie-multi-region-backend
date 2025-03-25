# Multi Region Setup: MongoDB Atlas

This guide walks you through installing the CLI, setting up your Atlas project, configuring a multi-region geo-sharded cluster, and finally connecting and interacting with your database.

It is useful to look at the changes along in the Atlas UI to get a feel for how the CLI commands are updating your project and cluster.

## Notes

1. There are cost implications of setting up a MongoDB Atlas Cluster. To avoid unnecessary charges, ensure the cluster is paused or terminated when it is not in use.

2. These steps are designed to complement the guidance provided in the HubSpot Developer Blog article, “Minimizing Latency: A Guide to High‑Performance App Cards on HubSpot.”

## Steps

1.  **Install the Atlas CLI**

    Install the Atlas CLI—a command-line tool for managing your MongoDB Atlas infrastructure, including clusters, network access, and backups.

    ```bash
    brew install mongodb-atlas-cli
    ```

2.  **Set Up Your Atlas Account and Project**

    *   Log in: Sign in to your Atlas account.
    *   Create a project: Use the Atlas UI to create a new project.

3.  **Authenticate with the Atlas CLI**

    Log in using your CLI credentials and choose a profile (e.g., hubspot):

    ```bash
    atlas auth login --profile hubspot
    ```

    Select your project from the list.

4.  **Define Environment Variables**

    Store your project ID, cluster name, profile, and database user as environment variables:

    ```bash
    CLUSTER_NAME=hubspot-cluster
    PROFILE=hubspot
    DB_USER=admin
    ```

5.  **Create the Cluster Configuration File**

    This command saves the following JSON configuration to a file (`mongodb-cluster-config-v0.json`).  This file defines a geo-sharded cluster with regional configurations (here, one region in US_EAST_1 and another in EU_CENTRAL_1).

    ```json
    echo '{
      "backupEnabled": true,
      "biConnector": {
        "enabled": false,
        "readPreference": "secondary"
      },
      "replicationSpecs": [
        {
          "numShards": 1,
          "regionConfigs": [
            {
              "electableSpecs": {
                "diskIOPS": 3000,
                "ebsVolumeType": "STANDARD",
                "instanceSize": "M30",
                "nodeCount": 3
              },
              "priority": 7,
              "providerName": "AWS",
              "regionName": "US_EAST_1",
              "autoScaling": {
                "compute": {
                  "enabled": true,
                  "maxInstanceSize": "M40",
                  "minInstanceSize": "M30",
                  "scaleDownEnabled": true
                },
                "diskGB": {
                  "enabled": true
                }
              }
            }
          ],
          "zoneName": "us-east-1"
        },
        {
          "numShards": 1,
          "regionConfigs": [
            {
              "electableSpecs": {
                "diskIOPS": 3000,
                "ebsVolumeType": "STANDARD",
                "instanceSize": "M30",
                "nodeCount": 3
              },
              "priority": 7,
              "providerName": "AWS",
              "regionName": "EU_CENTRAL_1",
              "autoScaling": {
                "compute": {
                  "enabled": true,
                  "maxInstanceSize": "M40",
                  "minInstanceSize": "M30",
                  "scaleDownEnabled": true
                },
                "diskGB": {
                  "enabled": true
                }
              }
            }
          ],
          "zoneName": "eu-central-1"
        }
      ],
      "clusterType": "GEOSHARDED",
      "diskSizeGB": 40,
      "globalClusterSelfManagedSharding": false
    }' > mongodb-cluster-config-v0.json
    ```

6.  **Create the Cluster**

    Use the Atlas CLI to create your cluster with the specified configuration:

    ```bash
    atlas clusters create $CLUSTER_NAME -f mongodb-cluster-config-v0.json -P $PROFILE
    ```

    You should see a message like:

    ```
    Cluster 'hubspot-cluster' is being created.
    ```

    Cluster creation typically takes about 10 minutes. You can monitor progress in the Atlas UI under the Clusters tab.

7.  **Configure Network Access**

    Create an access list entry to allow connections from any IP address (for testing).  **Note:** For production, restrict access to specific IP ranges.

    ```bash
    atlas accessLists create 0.0.0.0/0 --type cidrBlock -P $PROFILE --comment "Allow all (NOT RECOMMENDED)"
    ```

8.  **Create a Database User**

    Create a user with administrative privileges:

    ```bash
    atlas dbusers create atlasAdmin --username $DB_USER -P $PROFILE
    ```

    You'll be prompted to set a password.

9.  **Retrieve the Connection String**

    Get the MongoDB connection string required to connect to your cluster:

    ```bash
    CONNECTION_STRING=$(atlas clusters connectionString describe "$CLUSTER_NAME" -P $PROFILE --output json | jq -r '.standardSrv')
    ```

10. **Install the MongoDB Shell**

    Install `mongosh`, the interactive JavaScript shell for MongoDB, to connect and interact with your database.

    ```bash
    brew install mongosh
    ```

11. **Connect to Your Database**

    Launch `mongosh` using the connection string and your database user credentials:

    ```bash
    mongosh $CONNECTION_STRING --apiVersion 1 --username $DB_USER
    ```

12. **Create a Database and Collection**

    Inside `mongosh`, switch to a new database and create a collection:

    ```javascript
    use restaurant_management
    db.createCollection("restaurants")
    ```

13. **Enable Global Writes for Your Collection**

    From the Atlas UI, navigate to the "restaurants" collection and click “Global Writes”.
    Shard the collection using a compound shard key (e.g., location and postalCode):

    ```javascript
    sh.shardCollection("restaurant_management.restaurants", { location: 1, postalCode: 1 })
    ```
    Then, click the "Enable Global Writes" button in the UI to complete the setup. What we’ve done here so far helps Atlas stores restaurants in an appropriate shard based on the location of the restaurant. The location to zone mapping can also be modified explicitly from the UI after the cluster is provisioned. Also note that the `location` attribute must be a ISO 3166-1 Alpha-2 country code.

    Based on the current configuration, all restaurants with a location code of a country/state in green maps to the us-east-1 shard, and vice versa for the other locations.

14. **Insert Sample Data**

    Insert sample documents into your restaurants collection:

    ```javascript
    db.restaurants.insertMany([
      {
        location: "US",
        postalCode: "90210",
        name: "Spago",
        cuisine: "Californian",
      },
      {
        location: "FR",
        postalCode: "75008",
        name: "L'Arpège",
        cuisine: "French",
      },
      {
        location: "JP",
        postalCode: "104-0061",
        name: "Sukiyabashi Jiro",
        cuisine: "Sushi",
      }
    ]);
    ```

15. **Query the Collection**

    Test data retrieval by querying the collection. For example, to find restaurants in France with postal codes between 75000 and 75999:

    ```javascript
    db.restaurants.find({ location: "FR", postalCode: { $gte: "75000", $lte: "75999" } })
    ```

16. **Verify Shard Distribution**

    Ensure that your data is correctly distributed across shards by running explain plans:

    ```javascript
    db.restaurants.find({ location: "US" }).explain("executionStats")
    db.restaurants.find({ location: "JP" }).explain("executionStats")
    ```

    The `executionStats` results indicate that queries are routed to distinct shards based on their respective zones.

## What's next?

Our database is now ready to be used in our Application. Head over to the Vercel setup steps where we use this database to build our multi-region restaurant application.
