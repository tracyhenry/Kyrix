
# avg: fetch data time
perl -ne 'print "$1\n" if /Fetch data time: (.*?)ms/' liquor_serving_log.txt | awk '{ total += $1; count++ } END { print total/count }'
perl -ne 'print "$1\n" if /Fetch data time: (.*?)ms/' taxi_contour_serving_log.txt | awk '{ total += ($1 - 18.5349) * ($1 - 18.5349); count++ } END { print sqrt(total/(count-1)) }'

# avg: network time
perl -ne 'print "$1\n" if /Send response time: (.*?)ms./' liquor_serving_log.txt | awk '{ total += $1; count++ } END { print total/count }'
perl -ne 'print "$1\n" if /Send response time: (.*?)ms./' liquor_serving_log.txt | awk '{ total += ($1 - 0.442857) * ($1 - 0.442857); count++ } END { print sqrt(total/(count-1)) }'

# 95-percentile: fetch data time
perl -ne 'print "$1\n" if /Fetch data time: (.*?)ms/' liquor_serving_log.txt | sort -n | awk '{all[NR] = $0} END{print all[int(NR*0.95 - 0.5)]}'

# 95-percentile: network time
perl -ne 'print "$1\n" if /Send response time: (.*?)ms/' liquor_serving_log.txt | sort -n | awk '{all[NR] = $0} END{print all[int(NR*0.95 - 0.5)]}'


# indexing: KD-tree + redistribution
fgrep -A 1 "**********" liquor_indexing_log.txt

# single node parallel
perl -ne 'print "$1\n" if /Running single node clustering in parallel took: (.*?)s/' liquor_indexing_log.txt | awk '{ total += $1;} END { print total }'

# single node master
perl -ne 'print "$1\n" if /Running single node clustering on Citus master took: (.*?)s/' liquor_indexing_log.txt | awk '{ total += $1;} END { print total }'

# merge splits
perl -ne 'print "$1\n" if /Merge splits took: (.*?)s/' liquor_indexing_log.txt | awk '{ total += $1;} END { print total }'

# max #obj along a split
perl -ne 'print "$1\n" if /objects along this split: (.*?)\s/' liquor_indexing_log.txt | awk -v max=0 '{ if ($1 > max) max = $1} END { print max }'

# create index time
perl -ne 'print "$1\n" if /Creating gist index on centroid took: (.*?)s./' liquor_indexing_log.txt | awk '{ total += $1;} END { print total }'
