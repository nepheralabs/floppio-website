export const totalScore = state => state.results.reduce((sum, result) => sum + result.score, 0);
export const scoreAnswer = answer => answer.score;
