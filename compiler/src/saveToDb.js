// import mysql
const mysql = require("mysql");

// save the current to project to the database it's associated with
function saveToDb()
{
    // turn any unlayered canvas into a single layered canvas
    for (var i = 0; i < this.canvases.length; i ++) {
        var curId = this.canvases[i].id;

        // check if the current id exists
        var exist = false;
        for (var j = 0; j < this.layeredCanvases.length; j ++)
            for (var k = 0; k < this.layeredCanvases[j].length; k++)
                if (this.layeredCanvases[j][k] === curId)
                    exist = true;

        // create a single layer if it does not exist
        if (! exist)
            this.layeredCanvases.push([curId]);
    }

    // connecting with mysql
    var dbConn = mysql.createConnection({
        host     : this.dbConfig.host,
        user     : this.dbConfig.user,
        password : this.dbConfig.password
    });
    dbConn.connect(function(err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        console.log('connected as id ' + dbConn.threadId);
    });

    // create the database 'Kyrix' and ignore the error
    dbConn.query("CREATE DATABASE Kyrix;", function (err) {});

    // use the database
    dbConn.query("USE Kyrix;", function (err) {
       if (err) throw err;
    });

    // create a table and ignore the error
    var createTableQuery = "CREATE TABLE project (name VARCHAR(255), content TEXT" +
        ", CONSTRAINT PK_project PRIMARY KEY (name));";
    dbConn.query(createTableQuery, function (err) {});

    // turn the current project into a json blob
    var projectJSON = JSON.stringify(this, function (key, value) {
        if (typeof value === 'function')
            return value.toString();
        return value;
    });
    console.log(projectJSON);

    // insert the JSON blob into the project table
    var insertQuery = "INSERT INTO project (name, content) VALUES (\'" +
        this.name + "\', \'" + projectJSON + "\');"
    dbConn.query(insertQuery,
        function (err) {
            if (err) throw err;
        });

    dbConn.end();
}

// export
module.exports = {
    saveToDb : saveToDb
};
