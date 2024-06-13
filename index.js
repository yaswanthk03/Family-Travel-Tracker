import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

env.config();
const app = express();
const port = 3000;


const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

//Home page with all the users and 1st users visited countries
//-----------------------------Need to add error handling for zero users in the database -------------------------------------
app.get("/", async (req, res) => {
  //console.log(req);
  const countries = await checkVisisted();
  const noOfUsers = await db.query("SELECT * FROM users");
  const currentColor = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);
  //console.log(noOfUsers);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: noOfUsers.rows,
    color: currentColor.rows[0].color,
  });
});


//country name to be add to a particular user
//Has error handling for country not found and country already added
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      //console.log(err);
        const countries = await checkVisisted();
        const noOfUsers = await db.query("SELECT * FROM users");
        const currentColor = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);
  
        res.render("index.ejs", {
          countries: countries,
          total: countries.length,
          users: noOfUsers.rows,
          color: currentColor.rows[0].color,
          error: "Country already added",
        });
    }
  } catch (err) {
      //console.log(err);
      const countries = await checkVisisted();
      const noOfUsers = await db.query("SELECT * FROM users");
      const currentColor = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);
  
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: noOfUsers.rows,
        color: currentColor.rows[0].color,
        error: "Country not found",});
  }
});

//switching between users
app.post("/user", async (req, res) => {
  if( req.body.add === 'new' ) res.render('new.ejs');
  else {
    currentUserId = req.body.user;
    const currentColor = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);

    const countries = await checkVisisted();
    const noOfUsers = await db.query("SELECT * FROM users");
    console.log(noOfUsers.rows);
    console.log(currentColor.rows[0].color);
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: noOfUsers.rows,
      color: currentColor.rows[0].color,
    });
  }
});

//Add new user name and color with mandate user name
app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color || 'red';
  try {
    await db.query("INSERT INTO users (name,color) VALUES ($1,$2)", [name, color]);
    const currentUser = await db.query("SELECT id FROM users WHERE name = $1", [name]);
    const noOfUsers = await db.query("SELECT * FROM users");
    currentUserId = currentUser.rows[0].id;
    const countries = await checkVisisted();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: noOfUsers.rows,
      color: color,
    });
  } catch (err) { 
    console.log(err);
    console.log(currentUserId,"error");
    res.render('new.ejs', {error: "User name already exists"});
  }
  
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
