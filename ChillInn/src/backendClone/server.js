require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");

const axios = require('axios');
const FormData = require('form-data');

const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());

const bcrypt = require("bcrypt");
const saltRounds = 10;

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log(token);
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    console.log(user.email);

    req.user = user;
    next();
  });
};

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: "API key is missing" });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next(); 
};


const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://didactic-disco-v6p45w5gg4wxhxp7w-3000.app.github.dev",
  "https://upgraded-barnacle-9vwjvrpv7rgcpw4x-3000.app.github.dev",
  "https://organic-space-adventure-pjr9qxjq4vpgh6w65-3000.app.github.dev",
  "http://10.0.2.2:3000",
  "http://10.0.2.16:3000",
  "http://myapp.localhost:5173",
  "http://localhost:5174"
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'X-API-Key','Authorization'], 
  credentials: true,
};

app.use(validateApiKey);

app.use(cors(corsOptions));

const db = new sqlite3.Database("./hotel.db", (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Database opened successfully");

    db.serialize(() => {
      
     
      
      console.log("All tables created successfully.");
    });
  }
});



//User
// Add user (Guest or Admin)
app.post("/users/add-user", validateApiKey, async (req, res) => {
  const { email, password, fullname, phone_number, role, special_requests, access_level } = req.body;

  console.log("Init add-user");

  if (!email || !password || !fullname || !role) {
    console.log("Invalid request");
    return res.status(400).send("Missing required fields");
  }

  try {
    console.log("Checking if user already exists");

    db.get("SELECT email FROM User WHERE email = ?", [email], async (err, row) => {
      if (err) {
        console.error("Error checking email:", err);
        return res.status(500).send("Error checking email");
      }

      if (row) {
        console.log("Email already exists");
        return res.status(400).send("Email already exists");
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);

      console.log("Inserting into User table");

      db.run(
        `INSERT INTO User (email, password_hash, fullname, phone_number, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'Active', CURRENT_TIMESTAMP)`,
        [email, hashedPassword, fullname, phone_number, role],
        function (err) {
          if (err) {
            console.error("Error adding user:", err);
            return res.status(500).send("Error adding user");
          }

          const userId = this.lastID;

          console.log("User inserted, user_id:", userId);

          if (role.toLowerCase() === "guest") {
            console.log("Inserting into Guest table");

            db.run(
              `INSERT INTO Guest (guest_id, user_id, phone_number, special_requests)
               VALUES (?, ?, ?, ?)`,
              [userId, userId, phone_number, special_requests || null],
              (err) => {
                if (err) {
                  console.error("Error adding guest:", err);
                  return res.status(500).send("Error adding guest");
                }

                console.log("Guest added successfully");
                sendUserResponse(res, userId);
              }
            );

          } else if (role.toLowerCase() === "admin") {
            console.log("Inserting into Admin table");

            db.run(
              `INSERT INTO Admin (admin_id, user_id, access_level)
               VALUES (?, ?, ?)`,
              [userId, userId, access_level || "standard"],
              (err) => {
                if (err) {
                  console.error("Error adding admin:", err);
                  return res.status(500).send("Error adding admin");
                }

                console.log("Admin added successfully");
                sendUserResponse(res, userId);
              }
            );

          } else {
            return res.status(400).send("Invalid role. Must be 'guest' or 'admin'.");
          }
        }
      );
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).send("Internal server error");
  }
});

function sendUserResponse(res, userId) {
  db.get("SELECT * FROM User WHERE user_id = ?", [userId], (err, row) => {
    if (err) {
      console.error("Error retrieving user:", err);
      return res.status(500).send("Error retrieving user");
    }

    if (!row) {
      return res.status(404).send("User not found after insertion");
    }

    res.json({
      message: "User added successfully",
      user: {
        id: row.user_id,
        email: row.email,
        fullname: row.fullname,
        phone_number: row.phone_number,
        role: row.role,
        status: row.status,
        created_at: row.created_at,
      },
    });
  });
}

//edit user
app.put("/users/update-user", validateApiKey, async (req, res) => {
  const { userId, password, fullname, phone_number, role, special_requests, access_level } = req.body;

  console.log(`Init update-user for user ID: ${userId}`);

  if (!userId) {
    console.log("User ID is required");
    return res.status(400).send("User ID is required");
  }

  try {
    console.log("Checking if user exists");
    
    db.get("SELECT * FROM User WHERE user_id = ?", [userId], async (err, existingUser) => {
      if (err) {
        console.error("Error finding user:", err);
        return res.status(500).send("Error finding user");
      }

      if (!existingUser) {
        console.log("User not found");
        return res.status(404).send("User not found");
      }

      let hashedPassword = existingUser.password_hash;
      if (password) {
        console.log("Hashing new password");
        hashedPassword = await bcrypt.hash(password, saltRounds);
      }

      console.log("Updating User table");
      
      db.run(
        `UPDATE User 
         SET password_hash = COALESCE(?, password_hash),
             fullname = COALESCE(?, fullname),
             phone_number = COALESCE(?, phone_number),
             role = COALESCE(?, role)
         WHERE user_id = ?`,
        [
          hashedPassword || null,
          fullname || null,
          phone_number || null,
          role || null,
          userId
        ],
        function (err) {
          if (err) {
            console.error("Error updating user:", err);
            return res.status(500).send("Error updating user");
          }

          console.log("User table updated");

          if (role && role.toLowerCase() === "guest") {
            console.log("Updating Guest table");
            
            db.run(
              `INSERT OR REPLACE INTO Guest (guest_id, user_id, phone_number, special_requests)
               VALUES (?, ?, ?, ?)`,
              [userId, userId, phone_number || existingUser.phone_number, special_requests || null],
              (err) => {
                if (err) {
                  console.error("Error updating guest:", err);
                  return res.status(500).send("Error updating guest");
                }
                console.log("Guest updated successfully");
                sendUpdatedResponse(res, userId);
              }
            );

          } else if (role && role.toLowerCase() === "admin") {
            console.log("Updating Admin table");
            
            db.run(
              `INSERT OR REPLACE INTO Admin (admin_id, user_id, access_level)
               VALUES (?, ?, ?)`,
              [userId, userId, access_level || "standard"],
              (err) => {
                if (err) {
                  console.error("Error updating admin:", err);
                  return res.status(500).send("Error updating admin");
                }
                console.log("Admin updated successfully");
                sendUpdatedResponse(res, userId);
              }
            );

          } else {
            sendUpdatedResponse(res, userId);
          }
        }
      );
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).send("Internal server error");
  }
});

function sendUpdatedResponse(res, userId) {
  db.get(
    `SELECT u.*, 
            g.special_requests, 
            a.access_level
     FROM User u
     LEFT JOIN Guest g ON u.user_id = g.user_id
     LEFT JOIN Admin a ON u.user_id = a.user_id
     WHERE u.user_id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        console.error("Error fetching updated user:", err);
        return res.status(500).send("Error fetching updated user");
      }

      res.json({
        message: "User updated successfully",
        user: {
          id: user.user_id,
          email: user.email,
          fullname: user.fullname,
          phone_number: user.phone_number,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
          special_requests: user.special_requests,
          access_level: user.access_level
        }
      });
    }
  );
}

//login
app.post("/users/login", validateApiKey, (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt for:", email);

  if (!email || !password) {
    return res.status(400).send("Missing email or password");
  }

  db.get(
    "SELECT user_id, email, fullname, password_hash, role, status, google_id FROM User WHERE email = ?",
    [email],
    async (err, row) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Error finding user");
      }

      if (!row) {
        console.log("403 - User not found");
        return res.status(403).send("User not found");
      }
      
      if(row.status == 'Inactive'){
        return res.status(401).send("Account is Inactive");
      }

      if (row.google_id) {
        console.log("User registered via Google, cannot log in with password");
        return res
          .status(400)
          .send("This account is linked to Google. Please log in with Google.");
      }

      const isMatch = await bcrypt.compare(password, row.password_hash);
      if (!isMatch) {
        console.log("401 - Invalid password");
        return res.status(401).send("Invalid credentials");
      }

      const token = jwt.sign(
        { user_id: row.user_id, email: row.email, role: row.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login successful!",
        token,
        user: {
          id: row.user_id,
          email: row.email,
          fullname: row.fullname,
          role: row.role,
          status: row.status,
        },
      });

      console.log(row.email + " - Login success");
    }
  );
});


// Google Login Endpoint
app.post("/users/login-google", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).send("Missing Google token");
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub; 
    const email = payload.email;
    const fullname = payload.name;

    console.log("Google User:", { googleId, email, fullname });

    db.get("SELECT * FROM User WHERE google_id = ? OR email = ?", [googleId, email], (err, user) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Database error");
      }

      if (user) {
        if (!user.google_id) {
          db.run("UPDATE User SET google_id = ? WHERE email = ?", [googleId, email], (err) => {
            if (err) {
              console.error("Error updating Google ID:", err);
              return res.status(500).send("Error updating Google ID");
            }
          });
        }
        
        if(user.status == 'Inactive'){
          return res.status(401).send("Account is Inactive");
        }

        const token = jwt.sign(
          { user_id: user.user_id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        return res.json({
          message: "Login successful",
          token, 
          user: {
            id: user.user_id,
            email: user.email,
            fullname: user.fullname,
            phone_number: user.phone_number,
            role: user.role,
            status: user.status,
            created_at: user.created_at,
          },
        });
      } else {
        db.run(
          `INSERT INTO User (email, fullname, google_id, role, status, created_at)
           VALUES (?, ?, ?, 'guest', 'Active', CURRENT_TIMESTAMP)`,
          [email, fullname, googleId],
          function (err) {
            if (err) {
              console.error("Error adding Google user:", err);
              return res.status(500).send("Error adding Google user");
            }

            const userId = this.lastID;

            db.run(
              `INSERT INTO Guest (guest_id, user_id, phone_number, special_requests)
               VALUES (?, ?, ?, ?)`,
              [userId, userId, null, null],
              (err) => {
                if (err) {
                  console.error("Error adding guest:", err);
                  return res.status(500).send("Error adding guest");
                }

                const token = jwt.sign(
                  { user_id: userId, email: email, role: "guest" },
                  process.env.JWT_SECRET,
                  { expiresIn: "1h" }
                );

                res.json({
                  message: "User registered and logged in successfully",
                  token, 
                  user: {
                    id: userId,
                    email: email,
                    fullname: fullname,
                    role: "guest",
                    status: "Active",
                    created_at: new Date().toISOString(),
                  },
                });
              }
            );
          }
        );
      }
    });
  } catch (error) {
    console.error("Google token verification failed:", error);
    res.status(401).send("Invalid Google token");
  }
});


//get all users
app.get("/users/getallusers", validateApiKey, (req, res) => {
  db.all(
    `SELECT user_id, fullname, email, password_hash, phone_number, role, status, google_id, created_at 
     FROM User`,
    [],
    (err, users) => {
      if (err) return res.status(500).send("Error retrieving users");

      if (!users.length) {
        return res.status(404).send("No users found");
      }

      const userPromises = users.map((user) => {
        return new Promise((resolve) => {
          if (user.role === "guest") {
            db.get(
              "SELECT special_requests FROM Guest WHERE guest_id = ?",
              [user.user_id],
              (err, guest) => {
                user.special_requests = guest?.special_requests || null;
                resolve(user);
              }
            );
          } else if (user.role === "admin") {
            db.get(
              "SELECT access_level FROM Admin WHERE admin_id = ?",
              [user.user_id],
              (err, admin) => {
                user.access_level = admin?.access_level || "N/A";
                resolve(user);
              }
            );
          } else {
            resolve(user);
          }
        });
      });

      Promise.all(userPromises).then((updatedUsers) => {
        res.json(updatedUsers);
      });
    }
  );
});


//get user by id
app.get("/users/userinfobyid", validateApiKey, authenticateToken, (req, res) => {
  const userId = req.user.user_id; 

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  db.get(
    `SELECT user_id, fullname, email, phone_number, role, status, google_id, created_at 
     FROM User WHERE user_id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Error finding user");
      }

      if (!user) {
        return res.status(403).send("User not found");
      }

      if (user.role === "guest") {
        db.get(
          "SELECT special_requests FROM Guest WHERE guest_id = ?",
          [userId],
          (err, guest) => {
            if (err) {
              console.error("Error fetching guest details:", err);
            }
            res.json({ ...user, special_requests: guest?.special_requests || null });
          }
        );
      } else if (user.role === "admin") {
        db.get(
          "SELECT access_level FROM Admin WHERE admin_id = ?",
          [userId],
          (err, admin) => {
            if (err) {
              console.error("Error fetching admin details:", err);
            }
            res.json({ ...user, access_level: admin?.access_level || "N/A" });
          }
        );
      } else {
        res.json(user);
      }
    }
  );
});


app.put("/users/deactivateuserbyid", validateApiKey, (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  db.get("SELECT * FROM User WHERE user_id=?", [user_id], (err, user) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Error finding user" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    db.run("UPDATE User SET status='Inactive' WHERE user_id=?", [user_id], (err) => {
      if (err) {
        console.error("Error updating user status:", err);
        return res.status(500).json({ message: "Error updating user status" });
      }

      res.json({
        message: "User deactivated successfully",
        user: { ...user, status: "Inactive" },
      });

      console.log(`User ID ${user_id} marked as Inactive.`);
    });
  });
});
//User^

//Image
app.get('/cloudinary/upload-params', validateApiKey, (req, res) => {
  res.json({
    cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: 'ml_default',
    folder: 'kaz/images',
    resourceType: 'image',
    apiUrl: `https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`
  });
});

// Updated validation middleware for Image data
function validateImageData(req, res, next) {
  const required = ['image_purpose', 'image_url']; 
  const allowedPurposes = ['profile', 'room_preview', 'room_thumbnail', 'amenity'];
  
  if (!required.every(field => req.body[field])) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (!allowedPurposes.includes(req.body.image_purpose)) {
    return res.status(400).json({ error: 'Invalid image purpose' });
  }

  if (!req.body.guest_id && !req.body.room_id) {
    return res.status(400).json({ error: 'Either guest_id or room_id must be provided' });
  }

  next();
}

// Helper function to extract Cloudinary public_id from URL if not provided
function extractPublicIdFromUrl(image_url, cloudinary_public_id) {
  if (cloudinary_public_id) return cloudinary_public_id;
  
  if (image_url) {
    try {
      const urlParts = image_url.split('/');
      const filename = urlParts[urlParts.length - 1];
      let public_id = filename.substring(0, filename.lastIndexOf('.'));
      if (public_id.includes('/')) {
        public_id = public_id.split('/').pop();
      }
      return public_id;
    } catch (e) {
      console.error('Error extracting public_id from URL:', e);
      return null;
    }
  }
  return null;
}

// POST - Create image metadata
app.post('/images', validateApiKey, validateImageData, (req, res) => {
  const { 
    guest_id, 
    room_id, 
    image_purpose, 
    image_url, 
    cloudinary_public_id, 
    cloudinary_version,   
    cloudinary_signature,
    width, 
    height 
  } = req.body;
  
  const public_id = extractPublicIdFromUrl(image_url, cloudinary_public_id);
  
  const sql = `
    INSERT INTO Image 
    (guest_id, room_id, image_purpose, image_url, file_id, 
     cloudinary_public_id, cloudinary_version, cloudinary_signature,
     width, height)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    guest_id, room_id, image_purpose, image_url, public_id, // file_id = public_id for compatibility
    public_id, cloudinary_version, cloudinary_signature,
    width, height
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ 
      image_id: this.lastID,
      message: 'Image created successfully',
      cloudinary_public_id: public_id
    });
  });
});

// DELETE - Delete image record
app.delete('/images/:id', validateApiKey, (req, res) => {
  db.get('SELECT cloudinary_public_id FROM Image WHERE image_id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Image not found' });
    
    db.run('DELETE FROM Image WHERE image_id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({ 
        message: 'Image record deleted successfully',
        note: 'Image still exists in Cloudinary. Must use Cloudinary Dashboard or Admin API to delete the actual image.'
      });
    });
  });
});

// Profile image endpoints
app.post('/images/profile', validateApiKey, authenticateToken, (req, res) => {
  const { 
    guest_id, 
    image_url, 
    cloudinary_public_id,
    cloudinary_version,
    cloudinary_signature,
    width, 
    height 
  } = req.body;
  
  if (!guest_id || !image_url) {
    return res.status(400).json({ error: 'Missing required fields: guest_id and image_url' });
  }
  
  const public_id = extractPublicIdFromUrl(image_url, cloudinary_public_id);
  
  // First delete existing profile image(s)
  db.run(
    'DELETE FROM Image WHERE guest_id = ? AND image_purpose = ?',
    [guest_id, 'profile'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Now insert the new profile image
      db.run(
        `INSERT INTO Image 
        (guest_id, room_id, image_purpose, image_url, file_id, 
         cloudinary_public_id, cloudinary_version, cloudinary_signature,
         width, height)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          guest_id, 'profile', image_url, public_id,
          public_id, cloudinary_version, cloudinary_signature,
          width, height
        ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      res.status(201).json({
            image_id: this.lastID,
            message: 'Profile image updated successfully',
            previous_removed: true,
            cloudinary_public_id: public_id
          });
        }
      );
    }
  );
});

// Room thumbnail endpoint
app.post('/images/room-thumbnail', validateApiKey, authenticateToken, (req, res) => {
  const { 
    room_id, 
    image_url, 
    cloudinary_public_id,
    cloudinary_version,
    cloudinary_signature,
    width, 
    height 
  } = req.body;
  
  if (!room_id || !image_url) {
    return res.status(400).json({ error: 'Missing required fields: room_id and image_url' });
  }
  
  const public_id = extractPublicIdFromUrl(image_url, cloudinary_public_id);
  
  // First delete existing thumbnail
  db.run(
    'DELETE FROM Image WHERE room_id = ? AND image_purpose = ?',
    [room_id, 'room_thumbnail'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Now insert the new thumbnail
      db.run(
        `INSERT INTO Image 
        (guest_id, room_id, image_purpose, image_url, file_id, 
         cloudinary_public_id, cloudinary_version, cloudinary_signature,
         width, height)
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          room_id, 'room_thumbnail', image_url, public_id,
          public_id, cloudinary_version, cloudinary_signature,
          width, height
        ],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          res.status(201).json({
            image_id: this.lastID,
            message: 'Room thumbnail updated successfully',
            previous_removed: true,
            cloudinary_public_id: public_id
          });
        }
      );
    }
  );
});

// Room preview image endpoint
app.post('/images/room-preview', validateApiKey, authenticateToken, (req, res) => {
  const { 
    room_id, 
    image_url, 
    cloudinary_public_id,
    cloudinary_version,
    cloudinary_signature,
    width, 
    height 
  } = req.body;
  
  if (!room_id || !image_url) {
    return res.status(400).json({ error: 'Missing required fields: room_id and image_url' });
  }
  
  const public_id = extractPublicIdFromUrl(image_url, cloudinary_public_id);
  
  // For preview images, we don't delete existing ones as rooms can have multiple previews
  db.run(
    `INSERT INTO Image 
    (guest_id, room_id, image_purpose, image_url, file_id, 
     cloudinary_public_id, cloudinary_version, cloudinary_signature,
     width, height)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      room_id, 'room_preview', image_url, public_id,
      public_id, cloudinary_version, cloudinary_signature,
      width, height
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      res.status(201).json({
        image_id: this.lastID,
        message: 'Room preview image added successfully',
        cloudinary_public_id: public_id
      });
    }
  );
});

// GET profile image endpoint
app.get('/images/profile/:guest_id', validateApiKey, (req, res) => {
  const guest_id = req.params.guest_id;
  
  if (!guest_id) {
    return res.status(400).json({ error: 'Missing guest_id parameter' });
  }
  
  db.get(
    `SELECT image_id, image_url, cloudinary_public_id, width, height, created_at
     FROM Image 
     WHERE guest_id = ? AND image_purpose = 'profile'
     ORDER BY created_at DESC LIMIT 1`,
    [guest_id],
    (err, image) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (!image) {
        return res.status(404).json({ 
          message: 'No profile image found',
          imageUrl: null
        });
      }
      
      res.json({
        image_id: image.image_id,
        imageUrl: image.image_url,
        cloudinary_id: image.cloudinary_public_id,
        width: image.width,
        height: image.height,
        created_at: image.created_at
      });
    }
  );
});

// GET room thumbnail endpoint
app.get('/images/room-thumbnail/:room_id', validateApiKey, (req, res) => {
  const room_id = req.params.room_id;
  
  if (!room_id) {
    return res.status(400).json({ error: 'Missing room_id parameter' });
  }
  
  db.get(
    `SELECT image_id, image_url, cloudinary_public_id, width, height, created_at
     FROM Image 
     WHERE room_id = ? AND image_purpose = 'room_thumbnail'
     ORDER BY created_at DESC LIMIT 1`,
    [room_id],
    (err, image) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (!image) {
        return res.status(404).json({ 
          message: 'No thumbnail image found',
          imageUrl: null
        });
      }
      
      res.json({
        image_id: image.image_id,
        imageUrl: image.image_url,
        cloudinary_id: image.cloudinary_public_id,
        width: image.width,
        height: image.height,
        created_at: image.created_at
      });
    }
  );
});

// GET room preview images endpoint
app.get('/images/room-previews/:room_id', validateApiKey, (req, res) => {
  const room_id = req.params.room_id;
  
  if (!room_id) {
    return res.status(400).json({ error: 'Missing room_id parameter' });
  }
  
  db.all(
    `SELECT image_id, image_url, cloudinary_public_id, width, height, created_at
     FROM Image 
     WHERE room_id = ? AND image_purpose = 'room_preview'
     ORDER BY created_at DESC`,
    [room_id],
    (err, images) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        count: images ? images.length : 0,
        images: images ? images.map(img => ({
          image_id: img.image_id,
          imageUrl: img.image_url,
          cloudinary_id: img.cloudinary_public_id,
          width: img.width,
          height: img.height,
          created_at: img.created_at
        })) : []
      });
    }
  );
});

// DELETE room preview image endpoint
app.delete('/images/room-preview/:image_id', validateApiKey, authenticateToken, (req, res) => {
  const image_id = req.params.image_id;
  
  if (!image_id) {
    return res.status(400).json({ error: 'Missing image_id parameter' });
  }
  
  db.get(
    'SELECT image_id, room_id, image_purpose, cloudinary_public_id FROM Image WHERE image_id = ?',
    [image_id],
    (err, image) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!image) return res.status(404).json({ error: 'Image not found' });
      
      if (image.image_purpose !== 'room_preview') {
        return res.status(400).json({ 
          error: 'This endpoint is only for deleting room preview images' 
        });
      }
      
      db.run('DELETE FROM Image WHERE image_id = ?', [image_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          success: true,
          message: 'Room preview image deleted successfully',
          image_id: image_id,
          room_id: image.room_id,
          cloudinary_public_id: image.cloudinary_public_id
        });
      });
    }
  );
});
//Image^

//Room Related
// Get all rooms with full details
app.get('/rooms', validateApiKey, (req, res) => {
  db.all(
    `SELECT 
       r.room_id,
       r.room_number,
       r.status,
      r.room_type_id,
      rt.name as room_type_name,
       rt.price,
       rt.capacity,
      rt.description as room_type_description
     FROM Room r
     JOIN RoomType rt ON r.room_type_id = rt.room_type_id
     ORDER BY r.room_number`,
    [],
    (err, rooms) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get images for each room
      const getRoomsWithImages = rooms.map(room => {
        return new Promise((resolve, reject) => {
          db.all(
            `SELECT image_id, image_url, image_purpose, width, height, cloudinary_public_id 
             FROM Image 
             WHERE room_id = ? 
             ORDER BY image_purpose, created_at DESC`,
            [room.room_id],
            (err, images) => {
              if (err) return reject(err);
              
              // Group images by purpose
              const imagesByPurpose = {
                thumbnail: images.filter(img => img.image_purpose === 'room_thumbnail')[0] || null,
                previews: images.filter(img => img.image_purpose === 'room_preview') || []
              };
              
              resolve({
        ...room,
                images: imagesByPurpose
              });
            }
          );
        });
      });
      
      Promise.all(getRoomsWithImages)
        .then(results => {
          res.json(results);
        })
        .catch(err => {
          res.status(500).json({ error: err.message });
        });
    }
  );
});

// Get room by ID with full details
app.get('/rooms/:id', validateApiKey, (req, res) => {
  const roomId = req.params.id;

  db.get(
    `SELECT 
      r.room_id, 
      r.room_number, 
      r.status,
      r.room_type_id,
      rt.name as room_type_name,
      rt.price,
      rt.capacity,
      rt.description as room_type_description
     FROM Room r
     JOIN RoomType rt ON r.room_type_id = rt.room_type_id
     WHERE r.room_id = ?`,
    [roomId],
    (err, room) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!room) return res.status(404).json({ error: 'Room not found' });

      // Get images for the room
      db.all(
        `SELECT image_id, image_url, image_purpose, width, height, cloudinary_public_id 
         FROM Image 
         WHERE room_id = ? 
         ORDER BY image_purpose, created_at DESC`,
        [roomId],
        (err, images) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Group images by purpose
          const imagesByPurpose = {
            thumbnail: images.filter(img => img.image_purpose === 'room_thumbnail')[0] || null,
            previews: images.filter(img => img.image_purpose === 'room_preview') || []
          };
          
          // Get amenities for the room type
          db.all(
            `SELECT a.* 
             FROM Amenity a
             JOIN RoomTypeAmenity rta ON a.amenity_id = rta.amenity_id
             WHERE rta.room_type_id = ?`,
            [room.room_type_id],
            (err, amenities) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            ...room,
                amenities: amenities || [],
                images: imagesByPurpose
          });
            }
          );
        }
      );
    }
  );
});

// Create a new room
app.post('/rooms', validateApiKey, authenticateToken, (req, res) => {
  const { room_number, room_type_id, status = 'Available' } = req.body;
  
  if (!room_number || !room_type_id) {
    return res.status(400).json({ error: 'Room number and room type ID are required' });
  }
  
  // Check if room type exists
  db.get(
    `SELECT * FROM RoomType WHERE room_type_id = ?`,
    [room_type_id],
    (err, roomType) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!roomType) return res.status(400).json({ error: 'Room type not found' });
      
      // Check if room number already exists
      db.get(
        `SELECT * FROM Room WHERE room_number = ?`,
        [room_number],
        (err, existingRoom) => {
          if (err) return res.status(500).json({ error: err.message });
          if (existingRoom) return res.status(400).json({ error: 'Room number already exists' });
          
          // Create the room
          db.run(
            `INSERT INTO Room (room_number, room_type_id, status) VALUES (?, ?, ?)`,
            [room_number, room_type_id, status],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
              
              res.status(201).json({
                room_id: this.lastID,
                room_number,
                room_type_id,
                status,
                message: 'Room created successfully'
              });
            }
          );
        }
      );
    }
  );
});

// Update room details
app.put('/rooms/:id', validateApiKey, authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const { room_number, room_type_id, status } = req.body;
  
  if (!room_number && !room_type_id && !status) {
    return res.status(400).json({ error: 'At least one field must be provided to update' });
  }
  
  // Get current room data
  db.get(
    `SELECT * FROM Room WHERE room_id = ?`,
    [roomId],
    (err, currentRoom) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!currentRoom) return res.status(404).json({ error: 'Room not found' });
      
      // Check if new room number is already used (if changed)
      if (room_number && room_number !== currentRoom.room_number) {
        db.get(
          `SELECT * FROM Room WHERE room_number = ? AND room_id != ?`,
          [room_number, roomId],
          (err, existingRoom) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existingRoom) return res.status(400).json({ error: 'Room number already exists' });
            
            updateRoom();
          }
        );
      } else {
        updateRoom();
      }
      
      function updateRoom() {
        // Check if room type exists (if changed)
        if (room_type_id && room_type_id !== currentRoom.room_type_id) {
          db.get(
            `SELECT * FROM RoomType WHERE room_type_id = ?`,
            [room_type_id],
            (err, roomType) => {
              if (err) return res.status(500).json({ error: err.message });
              if (!roomType) return res.status(400).json({ error: 'Room type not found' });
              
              performUpdate();
            }
          );
        } else {
          performUpdate();
        }
      }
      
      function performUpdate() {
        // Build the update query dynamically
        const updates = [];
        const values = [];
        
        if (room_number) {
          updates.push('room_number = ?');
          values.push(room_number);
        }
        
        if (room_type_id) {
          updates.push('room_type_id = ?');
          values.push(room_type_id);
        }
        
        if (status) {
          updates.push('status = ?');
          values.push(status);
        }
        
        // Add the room ID to the values array
        values.push(roomId);

  db.run(
          `UPDATE Room SET ${updates.join(', ')} WHERE room_id = ?`,
          values,
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
              room_id: roomId,
              room_number: room_number || currentRoom.room_number,
              room_type_id: room_type_id || currentRoom.room_type_id,
              status: status || currentRoom.status,
              message: 'Room updated successfully'
            });
          }
        );
      }
    }
  );
});

// Delete a room
app.delete('/rooms/:id', validateApiKey, authenticateToken, (req, res) => {
  const roomId = req.params.id;
  
  // Check if room has bookings
  db.get(
    `SELECT COUNT(*) as count FROM Booking WHERE room_id = ?`,
    [roomId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete room as it has bookings associated with it',
          bookingCount: result.count
        });
      }
      
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete room images
        db.run(
          `DELETE FROM Image WHERE room_id = ?`,
          [roomId],
          err => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            // Delete the room
            db.run(
              `DELETE FROM Room WHERE room_id = ?`,
              [roomId],
              function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                
                if (this.changes === 0) {
                  db.run('ROLLBACK');
                  return res.status(404).json({ error: 'Room not found' });
                }
                
                db.run('COMMIT');
                
                res.json({ message: 'Room deleted successfully' });
              }
            );
          }
        );
      });
    }
  );
});

// Change room status - quick update endpoint
app.patch('/rooms/:id/status', validateApiKey, authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const { status } = req.body;
  
  if (!status || !['Available', 'Occupied', 'Maintenance', 'Cleaning'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required (Available, Occupied, Maintenance, or Cleaning)' });
  }
  
  db.run(
    `UPDATE Room SET status = ? WHERE room_id = ?`,
    [status, roomId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Room not found' });
      
      res.json({
        room_id: roomId,
        status,
        message: 'Room status updated successfully'
      });
    }
  );
});

//Room Related^

// Amenity Endpoints
app.post('/amenities', validateApiKey, authenticateToken, (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Amenity name is required' });
  }
  
  db.run(
    `INSERT INTO Amenity (name, description) VALUES (?, ?)`,
    [name, description || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      res.status(201).json({
        amenity_id: this.lastID,
        name,
        description,
        message: 'Amenity created successfully'
      });
    }
  );
});

app.get('/amenities', validateApiKey, (req, res) => {
  db.all(`SELECT * FROM Amenity ORDER BY name`, [], (err, amenities) => {
    if (err) return res.status(500).json({ error: err.message });
    
    res.json(amenities);
  });
});

app.get('/amenities/:id', validateApiKey, (req, res) => {
  const amenityId = req.params.id;
  
  db.get(`SELECT * FROM Amenity WHERE amenity_id = ?`, [amenityId], (err, amenity) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!amenity) return res.status(404).json({ error: 'Amenity not found' });
    
    res.json(amenity);
  });
});

app.put('/amenities/:id', validateApiKey, authenticateToken, (req, res) => {
  const amenityId = req.params.id;
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Amenity name is required' });
  }
  
  db.run(
    `UPDATE Amenity SET name = ?, description = ? WHERE amenity_id = ?`,
    [name, description || null, amenityId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Amenity not found' });
      
      res.json({
        amenity_id: amenityId,
        name,
        description,
        message: 'Amenity updated successfully'
      });
    }
  );
});

app.delete('/amenities/:id', validateApiKey, authenticateToken, (req, res) => {
  const amenityId = req.params.id;
  
  // First check if the amenity is used in any room type
  db.get(
    `SELECT COUNT(*) as count FROM RoomTypeAmenity WHERE amenity_id = ?`,
    [amenityId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete amenity as it is used by one or more room types' 
        });
      }
      
      // If not used, proceed with deletion
      db.run(`DELETE FROM Amenity WHERE amenity_id = ?`, [amenityId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Amenity not found' });
        
        res.json({ message: 'Amenity deleted successfully' });
      });
    }
  );
});

//Room Type Endpoints - Enhanced
app.post('/room-types', validateApiKey, authenticateToken, (req, res) => {
  const { name, price, capacity, description, amenity_ids } = req.body;
  
  if (!name || !price || !capacity) {
    return res.status(400).json({ error: 'Name, price, and capacity are required' });
  }
  
  // Start a transaction to ensure data consistency
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    db.run(
      `INSERT INTO RoomType (name, price, capacity, description) VALUES (?, ?, ?, ?)`,
      [name, price, capacity, description || null],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        const roomTypeId = this.lastID;
        
        // If amenity_ids are provided, add them to the room type
        if (amenity_ids && Array.isArray(amenity_ids) && amenity_ids.length > 0) {
          const stmt = db.prepare(
            `INSERT INTO RoomTypeAmenity (room_type_id, amenity_id) VALUES (?, ?)`
          );
          
          let hasErrors = false;
          
          amenity_ids.forEach(amenityId => {
            stmt.run([roomTypeId, amenityId], err => {
              if (err) {
                hasErrors = true;
                console.error('Error adding amenity to room type:', err.message);
              }
            });
          });
          
          stmt.finalize();
          
          if (hasErrors) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error adding amenities to room type' });
          }
        }
        
        db.run('COMMIT');
        
        res.status(201).json({
          room_type_id: roomTypeId,
          name,
          price,
          capacity,
          description,
          amenity_ids: amenity_ids || [],
          message: 'Room type created successfully'
        });
      }
    );
  });
});

app.get('/room-types', validateApiKey, (req, res) => {
  db.all(
    `SELECT rt.*, 
     (SELECT COUNT(*) FROM Room r WHERE r.room_type_id = rt.room_type_id) as room_count
     FROM RoomType rt
     ORDER BY rt.name`,
    [],
    (err, roomTypes) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // For each room type, get its amenities
      const getRoomTypesWithAmenities = roomTypes.map(roomType => {
        return new Promise((resolve, reject) => {
          db.all(
            `SELECT a.* 
             FROM Amenity a
             JOIN RoomTypeAmenity rta ON a.amenity_id = rta.amenity_id
             WHERE rta.room_type_id = ?`,
            [roomType.room_type_id],
            (err, amenities) => {
              if (err) return reject(err);
              
              resolve({
                ...roomType,
                amenities: amenities || []
              });
            }
          );
        });
      });
      
      Promise.all(getRoomTypesWithAmenities)
        .then(results => {
          res.json(results);
        })
        .catch(err => {
          res.status(500).json({ error: err.message });
        });
    }
  );
});

app.get('/room-types/:id', validateApiKey, (req, res) => {
  const roomTypeId = req.params.id;
  
  db.get(
    `SELECT * FROM RoomType WHERE room_type_id = ?`,
    [roomTypeId],
    (err, roomType) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!roomType) return res.status(404).json({ error: 'Room type not found' });
      
      // Get amenities for this room type
      db.all(
        `SELECT a.* 
         FROM Amenity a
         JOIN RoomTypeAmenity rta ON a.amenity_id = rta.amenity_id
         WHERE rta.room_type_id = ?`,
        [roomTypeId],
        (err, amenities) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            ...roomType,
            amenities: amenities || []
          });
        }
      );
    }
  );
});

app.put('/room-types/:id', validateApiKey, authenticateToken, (req, res) => {
  const roomTypeId = req.params.id;
  const { name, price, capacity, description, amenity_ids } = req.body;
  
  if (!name || !price || !capacity) {
    return res.status(400).json({ error: 'Name, price, and capacity are required' });
  }
  
  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    db.run(
      `UPDATE RoomType 
       SET name = ?, price = ?, capacity = ?, description = ?
       WHERE room_type_id = ?`,
      [name, price, capacity, description || null, roomTypeId],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Room type not found' });
        }
        
        // If amenity_ids are provided, update the amenities
        if (amenity_ids && Array.isArray(amenity_ids)) {
          // Remove existing amenities
          db.run(
            `DELETE FROM RoomTypeAmenity WHERE room_type_id = ?`,
            [roomTypeId],
            err => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              
              // If there are amenities to add
              if (amenity_ids.length > 0) {
                const stmt = db.prepare(
                  `INSERT INTO RoomTypeAmenity (room_type_id, amenity_id) VALUES (?, ?)`
                );
                
                let hasErrors = false;
                
                amenity_ids.forEach(amenityId => {
                  stmt.run([roomTypeId, amenityId], err => {
                    if (err) {
                      hasErrors = true;
                      console.error('Error adding amenity to room type:', err.message);
                    }
                  });
                });
                
                stmt.finalize();
                
                if (hasErrors) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Error updating amenities for room type' });
                }
              }
              
              db.run('COMMIT');
              
              res.json({
                room_type_id: roomTypeId,
                name,
                price,
                capacity,
                description,
                amenity_ids,
                message: 'Room type updated successfully'
              });
            }
          );
        } else {
          // If no amenity_ids provided, just commit the transaction
          db.run('COMMIT');
          
          res.json({
            room_type_id: roomTypeId,
            name,
            price,
            capacity,
            description,
            message: 'Room type updated successfully'
          });
        }
      }
    );
  });
});

app.delete('/room-types/:id', validateApiKey, authenticateToken, (req, res) => {
  const roomTypeId = req.params.id;
  
  // Check if any rooms use this room type
  db.get(
    `SELECT COUNT(*) as count FROM Room WHERE room_type_id = ?`,
    [roomTypeId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete room type as it is used by one or more rooms',
          roomCount: result.count
        });
      }
      
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Remove amenities associations
        db.run(
          `DELETE FROM RoomTypeAmenity WHERE room_type_id = ?`,
          [roomTypeId],
          err => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            // Delete the room type
            db.run(
              `DELETE FROM RoomType WHERE room_type_id = ?`,
              [roomTypeId],
              function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                
                if (this.changes === 0) {
                  db.run('ROLLBACK');
                  return res.status(404).json({ error: 'Room type not found' });
                }
                
                db.run('COMMIT');
                
                res.json({ message: 'Room type deleted successfully' });
              }
            );
          }
        );
      });
    }
  );
});

//Booking Endpoints
app.post('/bookings', validateApiKey, authenticateToken, (req, res) => {
  const { 
    guest_id, 
    room_id, 
    check_in, 
    check_out, 
    total_price,
    status = 'Pending' 
  } = req.body;
  
  if (!guest_id || !room_id || !check_in || !check_out || !total_price) {
    return res.status(400).json({ 
      error: 'Guest ID, room ID, check-in date, check-out date, and total price are required' 
    });
  }
  
  // Validate dates
  const checkInDate = new Date(check_in);
  const checkOutDate = new Date(check_out);
  const today = new Date();
  
  // Reset time to midnight for comparison
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD format' });
  }
  
  if (checkInDate < today) {
    return res.status(400).json({ error: 'Check-in date cannot be in the past' });
  }
  
  if (checkOutDate <= checkInDate) {
    return res.status(400).json({ error: 'Check-out date must be after check-in date' });
  }
  
  // Verify if guest exists
  db.get(
    `SELECT * FROM Guest WHERE guest_id = ?`,
    [guest_id],
    (err, guest) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!guest) return res.status(400).json({ error: 'Guest not found' });
      
      // Verify if room exists and is available
      db.get(
        `SELECT * FROM Room WHERE room_id = ?`,
        [room_id],
        (err, room) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!room) return res.status(400).json({ error: 'Room not found' });
          
          if (room.status !== 'Available') {
            return res.status(400).json({ error: `Room is not available (current status: ${room.status})` });
          }
          
          // Check for overlapping bookings
          db.all(
            `SELECT * FROM Booking 
             WHERE room_id = ? 
             AND status IN ('Confirmed', 'Pending')
             AND (
               (check_in <= ? AND check_out > ?) OR
               (check_in < ? AND check_out >= ?) OR
               (check_in >= ? AND check_out <= ?)
             )`,
            [
              room_id, 
              check_out, check_in, // Scenario 1: Existing booking starts before check-out and ends after check-in
              check_out, check_in, // Scenario 2: Existing booking starts before check-out and ends after check-in
              check_in, check_out  // Scenario 3: Existing booking is within the requested period
            ],
            (err, overlappingBookings) => {
              if (err) return res.status(500).json({ error: err.message });
              
              if (overlappingBookings && overlappingBookings.length > 0) {
                return res.status(400).json({ 
                  error: 'Room is not available for the selected dates',
                  overlappingBookings
                });
              }
              
              // Create the booking
              db.run(
                `INSERT INTO Booking (guest_id, room_id, check_in, check_out, status, total_price, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [guest_id, room_id, check_in, check_out, status, total_price],
                function(err) {
                  if (err) return res.status(500).json({ error: err.message });
                  
                  const bookingId = this.lastID;
                  
                  // If booking is confirmed, update room status
                  if (status === 'Confirmed') {
                    db.run(
                      `UPDATE Room SET status = 'Occupied' WHERE room_id = ?`,
                      [room_id],
                      err => {
                        if (err) {
                          console.error('Error updating room status:', err.message);
                        }
                      }
                    );
                  }
                  
                  res.status(201).json({
                    booking_id: bookingId,
                    guest_id,
                    room_id,
                    check_in,
                    check_out,
                    status,
                    total_price,
                    created_at: new Date().toISOString(),
                    message: 'Booking created successfully'
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get all bookings with filters
app.get('/bookings', validateApiKey, authenticateToken, (req, res) => {
  const { guest_id, room_id, status, from_date, to_date } = req.query;
  
  // Build query conditions
  const conditions = [];
  const params = [];
  
  if (guest_id) {
    conditions.push('b.guest_id = ?');
    params.push(guest_id);
  }
  
  if (room_id) {
    conditions.push('b.room_id = ?');
    params.push(room_id);
  }
  
  if (status) {
    conditions.push('b.status = ?');
    params.push(status);
  }
  
  if (from_date) {
    conditions.push('b.check_in >= ?');
    params.push(from_date);
  }
  
  if (to_date) {
    conditions.push('b.check_out <= ?');
    params.push(to_date);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  
  db.all(
    `SELECT 
      b.booking_id, b.guest_id, b.room_id, b.check_in, b.check_out, b.status, 
      b.total_price, b.created_at,
      r.room_number, r.status as room_status,
      rt.name as room_type_name, rt.price as room_price,
      u.fullname as guest_name, u.email as guest_email,
      g.phone_number as guest_phone
     FROM Booking b
     JOIN Room r ON b.room_id = r.room_id
     JOIN RoomType rt ON r.room_type_id = rt.room_type_id
     JOIN Guest g ON b.guest_id = g.guest_id
     JOIN User u ON g.user_id = u.user_id
     ${whereClause}
     ORDER BY b.created_at DESC`,
    params,
    (err, bookings) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get payments for each booking
      const getBookingsWithPayments = bookings.map(booking => {
        return new Promise((resolve, reject) => {
          db.all(
            `SELECT payment_id, amount, method, payment_date
             FROM Payment
             WHERE booking_id = ?
             ORDER BY payment_date DESC`,
            [booking.booking_id],
            (err, payments) => {
              if (err) return reject(err);
              
              const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
              const balance = booking.total_price - totalPaid;
              
              resolve({
                ...booking,
                payments: payments || [],
                payment_summary: {
                  total_price: booking.total_price,
                  total_paid: totalPaid,
                  balance: balance
                }
              });
            }
          );
        });
      });
      
      Promise.all(getBookingsWithPayments)
        .then(results => {
          res.json(results);
        })
        .catch(err => {
          res.status(500).json({ error: err.message });
        });
    }
  );
});

// Get booking by ID
app.get('/bookings/:id', validateApiKey, authenticateToken, (req, res) => {
  const bookingId = req.params.id;
  
  db.get(
    `SELECT 
      b.booking_id, b.guest_id, b.room_id, b.check_in, b.check_out, b.status, 
      b.total_price, b.created_at,
      r.room_number, r.status as room_status,
      rt.name as room_type_name, rt.price as room_price, rt.capacity,
      u.fullname as guest_name, u.email as guest_email,
      g.phone_number as guest_phone, g.special_requests
     FROM Booking b
     JOIN Room r ON b.room_id = r.room_id
     JOIN RoomType rt ON r.room_type_id = rt.room_type_id
     JOIN Guest g ON b.guest_id = g.guest_id
     JOIN User u ON g.user_id = u.user_id
     WHERE b.booking_id = ?`,
    [bookingId],
    (err, booking) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      
      // Get room images
      db.all(
        `SELECT image_id, image_url, image_purpose, width, height
         FROM Image
         WHERE room_id = ?
         ORDER BY image_purpose, created_at DESC`,
        [booking.room_id],
        (err, images) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Get payments
          db.all(
            `SELECT payment_id, amount, method, payment_date
             FROM Payment
             WHERE booking_id = ?
             ORDER BY payment_date DESC`,
            [bookingId],
            (err, payments) => {
              if (err) return res.status(500).json({ error: err.message });
              
              const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
              const balance = parseFloat(booking.total_price) - totalPaid;
              
              res.json({
                ...booking,
                room_images: images || [],
                payments: payments || [],
                payment_summary: {
                  total_price: parseFloat(booking.total_price),
                  total_paid: totalPaid,
                  balance: balance
                }
              });
            }
          );
        }
      );
    }
  );
});

// Update booking status
app.patch('/bookings/:id/status', validateApiKey, authenticateToken, (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;
  
  if (!status || !['Pending', 'Confirmed', 'Cancelled', 'Completed', 'No-Show'].includes(status)) {
    return res.status(400).json({ 
      error: 'Valid status is required (Pending, Confirmed, Cancelled, Completed, or No-Show)' 
    });
  }
  
  // Get current booking to check room status
  db.get(
    `SELECT * FROM Booking WHERE booking_id = ?`,
    [bookingId],
    (err, booking) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Update booking status
        db.run(
          `UPDATE Booking SET status = ? WHERE booking_id = ?`,
          [status, bookingId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Booking not found' });
            }
            
            // Update room status based on booking status
            let roomStatus;
            
            switch (status) {
              case 'Confirmed':
                // If check-in date is today, set to Occupied, otherwise leave as is
                const checkInDate = new Date(booking.check_in);
                const today = new Date();
                
                // Reset time to midnight for comparison
                today.setHours(0, 0, 0, 0);
                checkInDate.setHours(0, 0, 0, 0);
                
                if (checkInDate.getTime() === today.getTime()) {
                  roomStatus = 'Occupied';
                }
                break;
                
              case 'Cancelled':
              case 'No-Show':
                roomStatus = 'Available';
                break;
                
              case 'Completed':
                roomStatus = 'Cleaning'; // Room needs cleaning after checkout
                break;
                
              default:
                // Leave room status as is for Pending
                break;
            }
            
            if (roomStatus) {
              db.run(
                `UPDATE Room SET status = ? WHERE room_id = ?`,
                [roomStatus, booking.room_id],
                err => {
                  if (err) {
                    console.error('Error updating room status:', err.message);
                    // Continue with transaction even if room status update fails
                  }
                }
              );
            }
            
            db.run('COMMIT');
            
            res.json({
              booking_id: bookingId,
              status,
              message: 'Booking status updated successfully'
            });
          }
        );
      });
    }
  );
});

// Cancel booking
app.post('/bookings/:id/cancel', validateApiKey, authenticateToken, (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  
  // Get current booking info
  db.get(
    `SELECT * FROM Booking WHERE booking_id = ?`,
    [bookingId],
    (err, booking) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      
      if (['Cancelled', 'Completed', 'No-Show'].includes(booking.status)) {
        return res.status(400).json({ 
          error: `Booking cannot be cancelled as it is already ${booking.status}` 
        });
      }
      
      // Check if user is authorized (admin or owner of booking)
      const isAdmin = req.user.role === 'admin';
      const isOwner = req.user.user_id === booking.guest_id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Not authorized to cancel this booking' });
      }
      
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Update booking status
        db.run(
          `UPDATE Booking SET status = 'Cancelled' WHERE booking_id = ?`,
          [bookingId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            // Update room status to Available
            db.run(
              `UPDATE Room SET status = 'Available' WHERE room_id = ?`,
              [booking.room_id],
              err => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                
                // If cancelled by admin, log the action
                if (isAdmin) {
                  const action_detail = `Cancelled booking #${bookingId}${reason ? ': ' + reason : ''}`;
                  
                  db.run(
                    `INSERT INTO AdminAction (admin_id, action_type, action_detail)
                     VALUES (?, 'cancel_booking', ?)`,
                    [req.user.user_id, action_detail],
                    err => {
                      if (err) {
                        console.error('Error logging admin action:', err.message);
                        // Continue with transaction even if logging fails
                      }
                    }
                  );
                }
                
                db.run('COMMIT');
                
                res.json({
                  booking_id: bookingId,
                  status: 'Cancelled',
                  reason: reason || null,
                  message: 'Booking cancelled successfully'
                });
              }
            );
          }
        );
      });
    }
  );
});

//Payment Endpoints
app.post('/payments', validateApiKey, authenticateToken, (req, res) => {
  const { booking_id, amount, method } = req.body;
  
  if (!booking_id || !amount || !method) {
    return res.status(400).json({ error: 'Booking ID, amount, and method are required' });
  }
  
  // Verify booking exists
  db.get(
    `SELECT * FROM Booking WHERE booking_id = ?`,
    [booking_id],
    (err, booking) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!booking) return res.status(400).json({ error: 'Booking not found' });
      
      // Get total amount already paid
      db.all(
        `SELECT * FROM Payment WHERE booking_id = ?`,
        [booking_id],
        (err, payments) => {
          if (err) return res.status(500).json({ error: err.message });
          
          const totalPaid = payments ? payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) : 0;
          const remainingBalance = parseFloat(booking.total_price) - totalPaid;
          
          if (parseFloat(amount) > remainingBalance) {
            return res.status(400).json({ 
              error: `Payment amount (${amount}) exceeds remaining balance (${remainingBalance})` 
            });
          }
          
          // Create payment
          db.run(
            `INSERT INTO Payment (booking_id, amount, method, payment_date)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [booking_id, amount, method],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
              
              const paymentId = this.lastID;
              
              // Check if payment completes the total amount
              const newTotalPaid = totalPaid + parseFloat(amount);
              const isFullyPaid = newTotalPaid >= parseFloat(booking.total_price);
              
              // If booking is fully paid and not yet confirmed, update to confirmed
              if (isFullyPaid && booking.status === 'Pending') {
                db.run(
                  `UPDATE Booking SET status = 'Confirmed' WHERE booking_id = ?`,
                  [booking_id],
                  err => {
                    if (err) {
                      console.error('Error updating booking status:', err.message);
                    }
                  }
                );
              }
              
              res.status(201).json({
                payment_id: paymentId,
                booking_id,
                amount,
                method,
                payment_date: new Date().toISOString(),
                payment_summary: {
                  total_price: parseFloat(booking.total_price),
                  total_paid: newTotalPaid,
                  balance: parseFloat(booking.total_price) - newTotalPaid,
                  fully_paid: isFullyPaid
                },
                message: 'Payment recorded successfully'
              });
            }
          );
        }
      );
    }
  );
});

// Get payments for a booking
app.get('/payments/booking/:bookingId', validateApiKey, authenticateToken, (req, res) => {
  const bookingId = req.params.bookingId;
  
  db.all(
    `SELECT payment_id, booking_id, amount, method, payment_date
     FROM Payment
     WHERE booking_id = ?
     ORDER BY payment_date DESC`,
    [bookingId],
    (err, payments) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get booking total price
      db.get(
        `SELECT total_price FROM Booking WHERE booking_id = ?`,
        [bookingId],
        (err, booking) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!booking) return res.status(404).json({ error: 'Booking not found' });
          
          const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
          const balance = parseFloat(booking.total_price) - totalPaid;
          
          res.json({
            booking_id: bookingId,
            payments: payments || [],
            payment_summary: {
              total_price: parseFloat(booking.total_price),
              total_paid: totalPaid,
              balance: balance,
              fully_paid: balance <= 0
            }
          });
        }
      );
    }
  );
});

//Service Endpoints
app.post('/services', validateApiKey, authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can manage services' });
  }
  
  const { name, price } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Service name and price are required' });
  }
  
  db.run(
    `INSERT INTO Service (name, price) VALUES (?, ?)`,
    [name, price],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      res.status(201).json({
        service_id: this.lastID,
        name,
        price,
        message: 'Service created successfully'
      });
    }
  );
});

app.get('/services', validateApiKey, (req, res) => {
  db.all(
    `SELECT * FROM Service ORDER BY name`,
    [],
    (err, services) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json(services);
    }
  );
});

app.get('/services/:id', validateApiKey, (req, res) => {
  const serviceId = req.params.id;
  
  db.get(
    `SELECT * FROM Service WHERE service_id = ?`,
    [serviceId],
    (err, service) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!service) return res.status(404).json({ error: 'Service not found' });
      
      res.json(service);
    }
  );
});

app.put('/services/:id', validateApiKey, authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can manage services' });
  }
  
  const serviceId = req.params.id;
  const { name, price } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Service name and price are required' });
  }
  
  db.run(
    `UPDATE Service SET name = ?, price = ? WHERE service_id = ?`,
    [name, price, serviceId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Service not found' });
      
      res.json({
        service_id: serviceId,
        name,
        price,
        message: 'Service updated successfully'
      });
    }
  );
});

app.delete('/services/:id', validateApiKey, authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can manage services' });
  }
  
  const serviceId = req.params.id;
  
  // Check if service is used in any recommendations
  db.get(
    `SELECT COUNT(*) as count FROM Recommendation WHERE service_id = ?`,
    [serviceId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete service as it is used in recommendations',
          recommendationCount: result.count
        });
      }
      
      db.run(
        `DELETE FROM Service WHERE service_id = ?`,
        [serviceId],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          if (this.changes === 0) return res.status(404).json({ error: 'Service not found' });
          
          res.json({ message: 'Service deleted successfully' });
        }
      );
    }
  );
});

//Recommendation Endpoints
app.post('/recommendations', validateApiKey, authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create recommendations' });
  }
  
  const { guest_id, room_type_id, service_id, reason } = req.body;
  
  if (!guest_id || !room_type_id || !service_id) {
    return res.status(400).json({ 
      error: 'Guest ID, room type ID, and service ID are required' 
    });
  }
  
  // Verify guest exists
  db.get(
    `SELECT * FROM Guest WHERE guest_id = ?`,
    [guest_id],
    (err, guest) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!guest) return res.status(400).json({ error: 'Guest not found' });
      
      // Verify room type exists
      db.get(
        `SELECT * FROM RoomType WHERE room_type_id = ?`,
        [room_type_id],
        (err, roomType) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!roomType) return res.status(400).json({ error: 'Room type not found' });
          
          // Verify service exists
          db.get(
            `SELECT * FROM Service WHERE service_id = ?`,
            [service_id],
            (err, service) => {
              if (err) return res.status(500).json({ error: err.message });
              if (!service) return res.status(400).json({ error: 'Service not found' });
              
              // Create recommendation
              db.run(
                `INSERT INTO Recommendation (guest_id, room_type_id, service_id, reason)
                 VALUES (?, ?, ?, ?)`,
                [guest_id, room_type_id, service_id, reason || null],
                function(err) {
                  if (err) return res.status(500).json({ error: err.message });
                  
                  res.status(201).json({
                    recommendation_id: this.lastID,
                    guest_id,
                    room_type_id,
                    service_id,
                    reason,
                    message: 'Recommendation created successfully'
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.get('/recommendations/guest/:guestId', validateApiKey, authenticateToken, (req, res) => {
  const guestId = req.params.guestId;
  
  // Check if user is admin or the guest themselves
  const isAdmin = req.user.role === 'admin';
  const isOwner = req.user.user_id === parseInt(guestId);
  
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Not authorized to view these recommendations' });
  }
  
  db.all(
    `SELECT 
      r.recommendation_id, r.guest_id, r.room_type_id, r.service_id, r.reason,
      rt.name as room_type_name, rt.price as room_type_price,
      s.name as service_name, s.price as service_price
     FROM Recommendation r
     JOIN RoomType rt ON r.room_type_id = rt.room_type_id
     JOIN Service s ON r.service_id = s.service_id
     WHERE r.guest_id = ?
     ORDER BY r.recommendation_id DESC`,
    [guestId],
    (err, recommendations) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json(recommendations);
    }
  );
});

app.delete('/recommendations/:id', validateApiKey, authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete recommendations' });
  }
  
  const recommendationId = req.params.id;
  
  db.run(
    `DELETE FROM Recommendation WHERE recommendation_id = ?`,
    [recommendationId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Recommendation not found' });
      
      res.json({ message: 'Recommendation deleted successfully' });
    }
  );
});

//Admin Action Logs
app.get('/admin/actions', validateApiKey, authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view action logs' });
  }
  
  const { admin_id, action_type, date_from, date_to, limit = 100, offset = 0 } = req.query;
  
  // Build query conditions
  const conditions = [];
  const params = [];
  
  if (admin_id) {
    conditions.push('aa.admin_id = ?');
    params.push(admin_id);
  }
  
  if (action_type) {
    conditions.push('aa.action_type = ?');
    params.push(action_type);
  }
  
  if (date_from) {
    conditions.push('aa.action_timestamp >= ?');
    params.push(date_from);
  }
  
  if (date_to) {
    conditions.push('aa.action_timestamp <= ?');
    params.push(date_to);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  
  // Add pagination params
  params.push(parseInt(limit));
  params.push(parseInt(offset));
  
  db.all(
    `SELECT 
      aa.log_id, aa.admin_id, aa.action_type, aa.action_detail, aa.action_timestamp,
      u.fullname as admin_name, u.email as admin_email,
      a.access_level
     FROM AdminAction aa
     JOIN Admin a ON aa.admin_id = a.admin_id
     JOIN User u ON a.user_id = u.user_id
     ${whereClause}
     ORDER BY aa.action_timestamp DESC
     LIMIT ? OFFSET ?`,
    params,
    (err, actions) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get total count for pagination
      db.get(
        `SELECT COUNT(*) as total FROM AdminAction aa ${whereClause}`,
        params.slice(0, -2), // Remove limit and offset
        (err, countResult) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            actions,
            pagination: {
              total: countResult.total,
              limit: parseInt(limit),
              offset: parseInt(offset),
              page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
              total_pages: Math.ceil(countResult.total / parseInt(limit))
            }
          });
        }
      );
    }
  );
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = db;

