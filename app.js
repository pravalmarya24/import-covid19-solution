let express = require("express");
let { open } = require("sqlite");
let sqlite3 = require("sqlite3");
let app = express();
app.use(express.json());
let path = require("path");

let dbPath = path.join(__dirname, "covid19India.db");

let db = null;

let initializeDBAndServer = async function (request, response) {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, function () {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error:${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//Returns a list of all states in the state table
app.get("/states/", async function (request, response) {
  let getStateQuery = `
        SELECT *
        FROM 
            state
    `;
  let statesArray = await db.all(getStateQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

//Returns a state based on the state ID
app.get("/states/:stateId/", async function (request, response) {
  let { stateId } = request.params;
  let getStatesIdQuery = `
        SELECT *
        FROM 
            state
        WHERE 
            state_id = ${stateId};
    `;
  let statesIdArray = await db.get(getStatesIdQuery);
  response.send(convertStateDbObjectToResponseObject(statesIdArray));
});

//Create a district in the district table
app.post("/districts/", async function (request, response) {
  let { stateId, districtName, cases, cured, active, deaths } = request.body;
  let postDistrictQuery = `
        INSERT INTO
        district (state_id,district_name,cases,cured,active,deaths)
        VALUES 
        (
        '${districtName}',
         ${stateId},
         ${cases},
         ${cured},
         ${active},
        '${deaths}',
        );`;
  await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

//Returns a district based on the district ID
app.get("/districts/:districtId/", async function (request, response) {
  let { districtId } = request.params;
  let getDistrictIdQuery = `
            SELECT *
            FROM 
                district
            WHERE 
              district_id = ${districtId};
    `;
  let districtIdArray = await db.get(getDistrictIdQuery);
  response.send(convertDistrictDbObjectToResponseObject(districtIdArray));
});

//Deletes a district from the district table based on the district ID
app.delete("/districts/:districtId/", async function (request, response) {
  let { districtId } = request.params;
  let deleteDistrictQuery = `
            DELETE
            FROM 
                district
            WHERE
                district_id = ${districtId};
    `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Updates the details of a specific district based on the district ID
app.put("/districts/:districtId/", async function (request, response) {
  let { districtId } = request.params;
  let { districtName, stateId, cases, cured, active, deaths } = request.body;
  let putDistrictIdQuery = `
            UPDATE
                district
            SET 
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active}, 
            deaths = ${deaths}
            WHERE
                district_id = ${districtId};
      `;
  let districtIdArray = await db.run(putDistrictIdQuery);
  response.send("District Details Updated");
});

//Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async function (request, response) {
  let { districtId } = request.params;
  let getDistrictQuery = `
        SELECT state_name
        FROM
            district
        NATURAL JOIN
            state
        WHERE
            district_id = ${districtId};
    `;
  let arrayDis = await db.get(getDistrictQuery);
  response.send({ StateName: arrayDis.state_name });
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`;
  const stats = await db.get(getStateStatsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

module.exports = app;
