#include <iostream>
#include <vector>
#include <ctime>
using namespace std;

int main()
{
	srand(time(0));
	int width = 100000;
	int height = 100000;
	long long num_point = 1e9;

	freopen("dots.txt", "w", stdout);
	for (long long i = 0; i < num_point; i ++)
	{
		int x = rand() % width;
		int y = rand() % height;
		cout << i << "\t" << x << "\t" << y << endl;
	}

	return 0;
}
