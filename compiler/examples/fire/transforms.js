const Transform = require("../../src/Transform").Transform;

var stateMapTransform = new Transform(
    "SELECT crsprdt.state, crsprdt.fire_year, CASE WHEN total_fire_size IS NULL THEN 0 ELSE total_fire_size END " +
        "FROM state_year as crsprdt LEFT JOIN (SELECT state, fire_year, sum(fire_size::float) as total_fire_size FROM fire group by state, fire_year) as agg " +
        "ON crsprdt.state = agg.state and crsprdt.fire_year = agg.fire_year;",
    "fire",
    "",
    ["state", "year", "total_fire_size"],
    true
);

var barTransform = new Transform(
    "SELECT crsprdt.state, crsprdt.fire_year, crsprdt.stat_cause_descr, CASE WHEN total_fire_size IS NULL THEN 0 ELSE total_fire_size END " +
        "FROM state_year_cause as crsprdt " +
        "LEFT JOIN (SELECT state, fire_year, stat_cause_descr, sum(fire_size::float) as total_fire_size FROM fire group by state, fire_year, stat_cause_descr) as agg " +
        "ON crsprdt.state = agg.state and crsprdt.fire_year = agg.fire_year and crsprdt.stat_cause_descr = agg.stat_cause_descr;",
    "fire",
    "",
    ["state", "fire_year", "stat_cause_descr", "total_fire_size"],
    true
);

module.exports = {
    stateMapTransform,
    barTransform
};

//select state, fire_year into state_year from (select distinct(state) from fire) as a, (select distinct(fire_year) from fire) as b, state where a.state = state.abbr;

//select state, fire_year, stat_cause_descr into state_year_cause from (select distinct(state) from fire) as a, (select distinct(fire_year) from fire) as b, (select distinct(stat_cause_descr) from fire where stat_cause_descr = 'Debris Burning' or stat_cause_descr = 'Arson' or stat_cause_descr = 'Lightning' or stat_cause_descr = 'Equipment Use') as c, state where a.state = state.abbr;
