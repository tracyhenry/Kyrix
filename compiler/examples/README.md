## Example applications

Data for four example application can be found here: [nba](https://www.dropbox.com/s/baqb01thxvfthk5/nba_db_psql.sql?dl=0), [usmap](https://www.dropbox.com/s/youvfap909mk1m3/usmap_db_psql.sql?dl=0), [forest](https://www.dropbox.com/s/39ji04m926lfx5i/forest_db_psql.sql?dl=0) and [flare](https://www.dropbox.com/s/ugr3cx63ul3tt0k/flare_db_psql.sql?dl=0). 

To load data of `app` (can be one of `nba`, `usmap`, `forest` or `flare`) into your Postgres database, run the following:

      $ createdb app
      $ psql app < app.sql

