const fs = require('fs');

// Let's decode cur_%EA%B6%81.png or look at the stroke coordinates directly from index.html
// In index.html:
// strokes[0]: Cho_T2_ㄱ (badge 1)
// strokes[1]: Jung_T2_ㅜ (badge 2, horizontal)
// strokes[2]: Jung_T2_ㅜ (badge 3, vertical)
// strokes[3]: Jong_T2_ㅇ (badge 4)

// But look at Image 1 from the user!
// Image 1 has:
// Badge 1 on ㄱ
// Badge 2 on ㅜ horizontal
// Badge 3 on center line (X=42, Y=40)!
// Dash line goes vertically down from X=42, Y=40 to X=42, Y=52 in empty air!
// And font ink for ㅜ vertical stem is at X=57!
// Why did the user's Image 1 have badge 3 at X=42?
