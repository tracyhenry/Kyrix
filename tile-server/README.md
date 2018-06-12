# Backend Tile Server of Kyrix
## Dependencies
The backend dependecies are handled using maven. See `pom.xml` for the list of dependencies. To download and install maven, see the instructions [here](https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html). You may want to use Intellij as IDE which has a nice [support](https://www.jetbrains.com/help/idea/maven.html) for maven. 

## Get Data for the Example App
Download a small nba database from (https://www.dropbox.com/s/127lbntx0332dlb/nba_db.sql?dl=0). Load it into your MySQL as follows:

    $ mysql -u username -p               # login to mysql
    $ Enter password:                    # enter password
    $ > create database nba              # create a database 'nba'
    $ > exit                             # log out
    $ mysql -u root -p nba < nba_db.sql  # import 

## Server Configuration
To configure the server, rename `serverconfig.txt.example` to `serverconfig.txt`, which is added to `gitignore`. There should be six lines in the file:
* the project name (should be `nba` if you want to run the example spec)
* port number
* MySQL server name
* MySQL user name
* password
* **absolute** path to a directory containing d3-scale

More precisely, the directory on the last line should contain `node_modules/d3-scale` (i.e. you should have run `npm install d3` under this directory). If you have installed dependencies for compiler, you can directly specify the last line as the absolute path to the compiler folder.

## Run the server 
Run `mvn compile` to build the backend server. Run `mvn exec:java -Dexec.mainClass="main.Main"` to start the server. Then open your browser and go to `http://localhost:port#` to see the 
initial canvas. 
