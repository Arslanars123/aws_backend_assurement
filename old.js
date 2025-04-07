app.get(
  "/get-tasks",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const tasks = await db
        .collection("tasks")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }
);
app.get(
  "/get-checks",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const checks = await db
        .collection("checks")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(checks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch checks" });
    }
  }
);
app.get(
  "/get-controls",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const controls = await db
        .collection("controls")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(controls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch controls" });
    }
  }
);
app.get(
  "/get-descriptions",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const descriptions = await db
        .collection("descriptions")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(descriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch descriptions" });
    }
  }
);
app.get(
  "/get-draws",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const draws = await db
        .collection("draws")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(draws);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch draws" });
    }
  }
);
app.get(
  "/get-mentions",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const mentions = await db
        .collection("mentions")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(mentions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mentions" });
    }
  }
);
app.get(
  "/get-news",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const news = await db
        .collection("news")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(news);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  }
);
app.get(
  "/get-notes",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const notes = await db
        .collection("notes")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  }
);
app.get(
  "/get-plans",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const plans = await db
        .collection("plans")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  }
);
app.get(
  "/get-requests",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const requests = await db
        .collection("requests")
        .find({}, { requestion: { password: 0 } })
        .toArray();
      res.status(200).json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  }
);
app.get(
  "/get-schemes",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const schemes = await db
        .collection("schemes")
        .find({}, { schemeion: { password: 0 } })
        .toArray();
      res.status(200).json(schemes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schemes" });
    }
  }
);
app.get(
  "/get-statics",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const statics = await db
        .collection("statics")
        .find({}, { staticion: { password: 0 } })
        .toArray();
      res.status(200).json(statics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statics" });
    }
  }
);
app.get(
  "/get-supers",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const supers = await db
        .collection("supers")
        .find({}, { superion: { password: 0 } })
        .toArray();
      res.status(200).json(supers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supers" });
    }
  }
);
app.get(
  "/get-professions",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const draws = await db
        .collection("professions")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(draws);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profession" });
    }
  }
);
app.get(
  "/get-groups",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const groups = await db
        .collection("groups")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  }
);
app.get(
  "/get-deviations",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const deviations = await db
        .collection("deviations")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(deviations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deviations" });
    }
  }
);
app.get(
  "/get-parts",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const parts = await db
        .collection("parts")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(parts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch parts" });
    }
  }
);
