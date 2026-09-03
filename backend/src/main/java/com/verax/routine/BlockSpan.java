package com.verax.routine;

final class BlockSpan {

    static final int DAY = 24 * 60;

    private BlockSpan() {
    }

    static boolean overlaps(int startA, int endA, int startB, int endB) {
        for (int[] a : pieces(startA, endA)) {
            for (int[] b : pieces(startB, endB)) {
                if (a[0] < b[1] && b[0] < a[1]) {
                    return true;
                }
            }
        }
        return false;
    }

    private static int[][] pieces(int start, int end) {
        int stop = end == 0 ? DAY : end;
        if (stop > start) {
            return new int[][]{{start, stop}};
        }
        if (stop == start) {
            return new int[0][];
        }
        return new int[][]{{start, DAY}, {0, stop}};
    }
}
