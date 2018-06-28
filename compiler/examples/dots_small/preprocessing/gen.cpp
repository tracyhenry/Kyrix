#include <iostream>
#include <vector>
#include <ctime>
using namespace std;

int main()
{
	srand(time(0));
	int width = 15000;
	int height = 9000;
	int num_point = (long long) width * (long long) height / 100LL;

	freopen("dots_small.txt", "w", stdout);
	int id = 0;
	for (int i = 0; i < num_point; i ++)
	{
		int x = rand() % width;
		int y = rand() % height;
		cout << (id ++) << "\t" << x << "\t" << y << "\t" << 0 << endl;
	}

	for (int i = 0; i < num_point; i ++)
	{
		int x = rand() % width;
		int y = rand() % height;
		cout << (id ++) << "\t" << x << "\t" << y + 11000 << "\t" << 1 << endl;
	}
	return 0;
}
