# Backend Tile Server of Kyrix
## Dependencies
MySQL JDBC driver needed. Download the driver [here](https://dev.mysql.com/downloads/connector/j/), extract the zip/tar file and add the `mysql-connector-java-xx-bin.jar` file as an external library. 
## Server Configuration
To configure the server, rename `serverconfig.txt.example` to `serverconfig.txt`, which is added to `gitignore`. There should be five lines in the file:
* the project name
* port number
* MySQL server name
* MySQL user name
* password
