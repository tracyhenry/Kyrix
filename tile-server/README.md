# Backend Tile Server of Kyrix
## Dependencies
The backend dependecies are handled using maven. See `pom.xml` for the list of dependencies. To download and install maven, see the instructions [here](https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html). You may want to use Intellij as IDE which has a nice [support](https://www.jetbrains.com/help/idea/maven.html) for maven. 

## Server Configuration
To configure the server, rename `serverconfig.txt.example` to `serverconfig.txt`, which is added to `gitignore`. There should be six lines in the file:
* the project name
* port number
* MySQL server name
* MySQL user name
* password
* path to a directory containing d3-scale

## Run the server
Run `mvn compile` to build the backend server. Run `mvn exec:java -Dexec.mainClass="main.Main"` to start the server. Then open your browser and go to `http://localhost:port#` to see the initial canvas. 
