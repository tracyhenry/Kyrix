// performance tests for fast data generation

// recommended compilation: g++ -O2 gen_fast.cpp -o gen_fast; ./gen_fast 100000000 > file.txt
// i.e. 100M records

// the direct way to do this in postgresql:
// create table gen(id bigint, w int, h int) as
// select id, (random()*100000)::bigint, (random()*100000)::bigint from generate_series(1,10000000) id;

#include <iostream>
#include <vector>
#include <ctime>
using namespace std;

#define NUM_PER_TIMESLICE 100000

int width = 100000;
int height = 100000;

char recs[NUM_PER_TIMESLICE*50];
inline void gen_sprintf(long long i) {
  char* loc = recs;
  for (int j = 0; j < NUM_PER_TIMESLICE; j++) {
    loc += sprintf(loc, "%lld\t%d\t%d\n", i+j, rand() % width, rand() % width);
  }
  cout << recs;
}

inline void gen_printf(long long i) {
  for (int j = 0; j < NUM_PER_TIMESLICE; j++) {
    printf("%lld\t%d\t%d\n", i+j, rand() % width, rand() % width);
  }
}

int main(int argc, char* argv[])
{
  srand(time(0));
  if (argc < 2) {
    printf("Usage: %s <number of points>\n", argv[0]);
    return 1;
  }
  long long num_point = stoi(argv[1]);
  if (num_point % NUM_PER_TIMESLICE != 0) {
    printf("error: <number of points> must be divisible by %d", NUM_PER_TIMESLICE);
    return 2;
  }

  cout << "id\tw\th" << endl;
  time_t start_ts = time(NULL);
  time_t last_ts = 0;
  for (long long i = 0; i < num_point; ) {
    gen_printf(i);
    i += NUM_PER_TIMESLICE;
    time_t end_ts = time(NULL);
    time_t cur_secs = end_ts - start_ts;
    if (cur_secs > last_ts) {
      last_ts = cur_secs;
      cerr << "cur: " << cur_secs << " sec. " << i << " recs generated. " <<
	(i / (double) cur_secs / 1e6) << " million/sec." << endl;
    }
  }
  return 0;
}
