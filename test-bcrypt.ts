import bcrypt from "bcryptjs";

async function test() {
  try {
    const hash = await bcrypt.hash("test", 10);
    console.log("Hash success:", hash);
    const match = await bcrypt.compare("test", hash);
    console.log("Match success:", match);
  } catch (e) {
    console.error("Bcrypt test failed:", e);
  }
}

test();
