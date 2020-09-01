# Flare Class Hierarchy
<p align="center">
<a href="https://github.com/tracyhenry/Kyrix/tree/master/compiler/examples/USMap">
<img src="https://media.giphy.com/media/TkDRjJknUHDspwTcJV/giphy.gif" width = "450"/>
</a>
</p>

This example app visualizes classes in the [Flare visualization library](https://blokt.com/tool/prefuse-flare) in a zoomable circle packing layout. The user can click on a class to zoom into another view showing its direct child classes. This visualization is composed of only one canvas, so the zoom object is a self-loop of this canvas.


# Installation Instructions for the Impatient
After running `sudo ./run-kyrix.sh --nba`, open another terminal tab and run the following commands:
```
wget https://www.dropbox.com/s/ugr3cx63ul3tt0k/flare_db_psql.sql     # download data
sudo ./docker-scripts/load-sql.sh flare_db_psql.sql --dbname flare   # load data into the database, must be run in root folder
cp docker-scripts/compile.sh compiler/examples/flare/compile.sh      # copy the compile script
cd compiler/examples/flare                                           # go to the app directory
chmod +x compile.sh                                                  # make the compile script excutable
sudo ./compile.sh flare.js                                           # compile the application
```
Wait for about one minute, then point your browser at <ip address>:8000 - remember that if you are using a cloud instance you may (probably) need to open your cloud provider's firewall for this port. If that sounds scary, you can create an SSH tunnel from your PC (e.g. Mac) using `ssh -N <server ipaddr> -L 8000:<same ipaddr>:8000` to forward your laptop's port 8000 to the server via [SSH tunneling](https://www.tecmint.com/create-ssh-tunneling-port-forwarding-in-linux/). 

note that you'll need to wait for a message saying `Backend server started...` like this:
```
Serving /project
New project definition coming...
There is diff that requires recomputing indexes. Shutting down server and recomputing...
Precomputing...
Done precomputing!
Completed recomputing indexes. Server restarting...
Backend server started...
```

Please refer to the [tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial) for more details on how to start writing your own Kyrix application!
