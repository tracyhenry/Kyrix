This is an application used to test performance/scalability. 

For dots-uniform, the assumption is that the data is distributed evenly/randomly across the canvas.

## Generating data (legacy)
As defined in `transform.js`, running this app needs a database `dots` with a relation `dots`, whose schema is `create table dots (id int, x int, y int);`.  The data generator `/datagen/gen.cpp` can generate a file which you can use to populate the `dots` relation (e.g. in Postgres, `COPY dots FROM 'absolute/path/to/data/file'`).  You can modify `num_points` in the cpp file to vary the number of total points.

## Running the app
You need to change the first line of the kyrix config file to `dots` (name of the app), restart the server, then run `node dots.js`. 

You will see a scatterplot with uniformly distributed dots. There are two zoom levels (double click to zoom in, shift + double click to zoom out).  There are three parameters you can tune to adjust visual density (which greatly affects performance): `num_points` in the data generator, `topWidth` and `topHeight` in `dots.js`.If you have Trypophobia, be careful not to make it too dense....
