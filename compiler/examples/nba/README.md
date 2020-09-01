# NBA Basketball Data Visualization

<p align="center">
<a href="https://github.com/tracyhenry/Kyrix/tree/master/compiler/examples/USMap">
<img src="https://media.giphy.com/media/LqmgdFV6uVMT8UPezi/giphy.gif" width = "450"/>
</a>
</p>

This example app visualizes NBA data in the season 2017~2018. There are four canvases, showing different type of entities in the dataset: teams, games, plays and boxscores. Canvases are connected via semantic zooms, allowing users to see related entities of an entity of interest. 

# Installation Instructions for the Impatient
After running `sudo ./run-kyrix.sh --nba`, you should be able to see this application at <ip address>:8000. If later you want to switch back to this application, you can run the following commands in a separate terminal:

```
cp docker-scripts/compile.sh compiler/examples/nba/compile.sh        # copy the compile script (run in the root folder)
cd compiler/examples/nba                                             # go to the app directory
chmod +x compile.sh                                                  # make the compile script excutable
sudo ./compile.sh nba.js                                             # compile the application
```
Wait for about one minute, then point your browser at `<ip address>:8000` - remember that if you are using a cloud instance you may (probably) need to open your cloud provider's firewall for this port. If that sounds scary, you can create an SSH tunnel from your PC (e.g. Mac) using `ssh -N <server ipaddr> -L 8000:<same ipaddr>:8000` to forward your laptop's port 8000 to the server via [SSH tunneling](https://www.tecmint.com/create-ssh-tunneling-port-forwarding-in-linux/). 

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
