const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

// Public routes
router.get("/posts", async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status = "published" } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, u.first_name, u.last_name, u.profile_picture_url
      FROM blog_posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.status = ?
    `;
    const queryParams = [status];

    if (category) {
      query += " AND p.category = ?";
      queryParams.push(category);
    }

    query += " ORDER BY p.published_at DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), offset);

    const [posts] = await req.app.get("db").query(query, queryParams);
    const [countResult] = await req.app
      .get("db")
      .query("SELECT COUNT(*) as total FROM blog_posts WHERE status = ?", [
        status,
      ]);

    res.json({
      posts,
      total: countResult[0].total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(countResult[0].total / limit),
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ message: "Error fetching blog posts" });
  }
});

router.get("/posts/:slug", async (req, res) => {
  try {
    const [post] = await req.app.get("db").query(
      `SELECT p.*, u.first_name, u.last_name, u.profile_picture_url
       FROM blog_posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.slug = ? AND p.status = 'published'`,
      [req.params.slug]
    );

    if (!post[0]) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post[0]);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    res.status(500).json({ message: "Error fetching blog post" });
  }
});

// Admin routes
router.get(
  "/admin/posts",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
      SELECT p.*, u.first_name, u.last_name
      FROM blog_posts p
      JOIN users u ON p.author_id = u.id
    `;
      const queryParams = [];

      if (status) {
        query += " WHERE p.status = ?";
        queryParams.push(status);
      }

      query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
      queryParams.push(parseInt(limit), offset);

      const [posts] = await req.app.get("db").query(query, queryParams);
      const [countResult] = await req.app
        .get("db")
        .query(
          "SELECT COUNT(*) as total FROM blog_posts" +
            (status ? " WHERE status = ?" : ""),
          status ? [status] : []
        );

      res.json({
        posts,
        total: countResult[0].total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult[0].total / limit),
      });
    } catch (error) {
      console.error("Error fetching admin blog posts:", error);
      res.status(500).json({ message: "Error fetching blog posts" });
    }
  }
);

router.post(
  "/admin/posts",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const {
        title,
        content,
        excerpt,
        category,
        tags,
        status,
        meta_description,
        featured_image,
      } = req.body;

      // Create URL-friendly slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const [result] = await req.app.get("db").query(
        `INSERT INTO blog_posts (
        title, slug, content, excerpt, author_id, status,
        category, tags, meta_description, featured_image,
        published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          slug,
          content,
          excerpt,
          req.user.id,
          status,
          category,
          JSON.stringify(tags),
          meta_description,
          featured_image,
          status === "published" ? new Date() : null,
        ]
      );

      res.status(201).json({
        message: "Post created successfully",
        postId: result.insertId,
      });
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ message: "Error creating blog post" });
    }
  }
);

router.put(
  "/admin/posts/:id",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const {
        title,
        content,
        excerpt,
        category,
        tags,
        status,
        meta_description,
        featured_image,
      } = req.body;

      // Update published_at if post is being published for the first time
      const [currentPost] = await req.app
        .get("db")
        .query("SELECT status FROM blog_posts WHERE id = ?", [req.params.id]);

      const publishedAt =
        currentPost[0].status !== "published" && status === "published"
          ? new Date()
          : null;

      await req.app.get("db").query(
        `UPDATE blog_posts 
       SET title = ?, content = ?, excerpt = ?, category = ?,
           tags = ?, status = ?, meta_description = ?, 
           featured_image = ?
           ${publishedAt ? ", published_at = ?" : ""}
       WHERE id = ?`,
        [
          title,
          content,
          excerpt,
          category,
          JSON.stringify(tags),
          status,
          meta_description,
          featured_image,
          ...(publishedAt ? [publishedAt] : []),
          req.params.id,
        ]
      );

      res.json({ message: "Post updated successfully" });
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ message: "Error updating blog post" });
    }
  }
);

router.delete(
  "/admin/posts/:id",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      await req.app
        .get("db")
        .query("DELETE FROM blog_posts WHERE id = ?", [req.params.id]);

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Error deleting blog post" });
    }
  }
);

// Categories
router.get("/categories", async (req, res) => {
  try {
    const [categories] = await req.app
      .get("db")
      .query("SELECT * FROM blog_categories ORDER BY name");
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

router.post(
  "/admin/categories",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const [result] = await req.app
        .get("db")
        .query(
          "INSERT INTO blog_categories (name, slug, description) VALUES (?, ?, ?)",
          [name, slug, description]
        );

      res.status(201).json({
        message: "Category created successfully",
        categoryId: result.insertId,
      });
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Error creating category" });
    }
  }
);

router.get("/", async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    console.log("Fetching blog posts with params:", req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offset = (page - 1) * limit;

    // Get posts
    const [posts] = await connection.execute(
      `SELECT 
        id,
        title,
        excerpt,
        content,
        category,
        published_at,
        slug,
        created_at
      FROM blog_posts
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Format the posts
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content,
      category: post.category || "Uncategorized",
      date: new Date(post.published_at || post.created_at).toLocaleDateString(),
      readTime: `${Math.ceil(
        (post.content?.split(" ").length || 0) / 200
      )} min read`,
      slug: post.slug,
    }));

    res.json({
      posts: formattedPosts,
      currentPage: page,
      totalPages: Math.ceil(posts.length / limit),
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({
      message: "Error fetching blog posts",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
