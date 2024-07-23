// Backend (server.js)
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser=require('body-parser');
const app = express();
const nodemailer=require('nodemailer');
app.use(cors());
app.use(express.json());

const connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'users'
});

connection.getConnection(error => {
  if (error) {
    console.error('Error connecting to MySQL database:', error);
    return;
  }
  console.log('Connected to MySQL database');
});

// Handle login request
app.post('/login', (req, res) => {
  const { email, otp } = req.body;
  let role = '';
  let id = null; // Initialize id variable
  
  // Determine role based on email
  if (email === 'akhilaappana10@gmail.com') {
      role = 'admin';
  } else if (email.includes('@svecw.edu.in')) {
      role = 'student';
  } else if (email.includes('@')) {
      role = 'warden';
  }
  
  // Update outing_requests table with role and retrieve id
  connection.query('UPDATE outing_requests SET role = ? WHERE email = ?', [role, email], (err, result) => {
    if (err) {
      console.error('Error updating user details:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    
    // Retrieve the id after the update
    connection.query('SELECT id FROM outing_requests WHERE email = ?', [email], (err, result) => {
      if (err) {
        console.error('Error retrieving user id:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      
      if (result.length > 0) {
        id = result[0].id;
      }
      
      // Send response with role and id
      res.json({ role, id });
    });
  });
});



app.post('/update-status/:id', (req, res) => {
  const { id } = req.params;
  const { statusData } = req.body; // Change this line
  const { status, reason } = statusData; // Change this line
  connection.query(
    'UPDATE outing_requests SET status = ? ,student_reason=? WHERE id = ?',
    [status,reason, id],
    (error, results) => {
      if (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      connection.query(
        'INSERT INTO history (student_id, email, request_date, status) SELECT id, email, startDate, status FROM outing_requests WHERE id = ?',
        [id],
        (error, results) => {
          if (error) {
            console.error('Error adding request to history:', error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }
          res.json({ message: 'Request approved successfully' });
        }
      );
      
      res.json({ message: 'Status updated successfully' });
    }
    
  );
    
});



app.post('/update-status2/:id', (req, res) => {
  const { id } = req.params;
  const { status2 } = req.body;
  connection.query(
    'UPDATE outing_requests SET status2 = ?,status=? WHERE id = ?',
    [status2, status2, id],
    (error, results) => {
      if (error) {
        console.error('Error updating status2:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      connection.query(
        'INSERT INTO history (student_id, email, request_date, status) SELECT id, email, startDate, status2 FROM outing_requests WHERE id = ?',
        [id],
        (error, results) => {
          if (error) {
            console.error('Error adding request to history:', error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }
          res.json({ message: 'Status2 updated successfully' });
        }
      );
    }
  );
});



// Assuming you already have the necessary imports and setup for Express and MySQL

// Route to fetch status from the database
app.get('/status/:id', (req, res) => {
  const  { id } = req.params;
  // Assuming you have a MySQL table named 'status_table' with columns 'userId', 'status', and 'status2'
  connection.query(
      'SELECT status, status2 FROM outing_requests WHERE id = ?',
      [id],
      (error, results) => {
          if (error) {
              console.error('Error fetching status:', error);
              res.status(500).json({ error: 'Internal Server Error' });
              return;
          }
          if (results.length === 0) {
              res.status(404).json({ error: 'Status not found for the user' });
              return;
          }
          const { status, status2 } = results[0];
          res.json({ status, status2 });
      }
  );
});





app.get('/student/:email', (req, res) => {
  const { email } = req.params;
  connection.query('SELECT * FROM outing_requests WHERE id = ?', [email], (error, results) => {
    if (error) {
      console.error('Error fetching student details:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    const student = results[0];
    res.json(student);
  });
});



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Generate OTP and send to user's email
app.post('/generateOTP', (req, res) => {
    const email = req.body.email;

    // Check if the email already exists in the database
    connection.query('SELECT * FROM outing_requests WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error checking email existence');
        } else {
            if (result.length > 0) {
                // If the email already exists, generate and update the OTP
                const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

                // Update OTP in the database
                connection.query('UPDATE outing_requests SET otp = ? WHERE email = ?', [otp, email], (err, result) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send('Error updating OTP');
                    } else {
                        // Send OTP to user's email
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'isvecw@gmail.com',
                                pass: 'pfdk sjrg wrxe iiqp'
                            }
                        });

                        const mailOptions = {
                            from: 'isvecw@gmail.com',
                            to: email,
                            subject: 'OTP Verification',
                            text: `Your updated OTP for verification is: ${otp}`
                        };

                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                console.error('Error sending email:', error);
                                res.status(500).send('Error sending OTP');
                            } else {
                                console.log('Email sent: ' + info.response);
                                res.status(200).send('OTP sent successfully');
                            }
                        });            
                    }
                });
            } else {
                // If the email does not exist in the database, show an alert
                res.status(404).send('Email not found in database');
            }
        }
    });
});

// Verify OTP
app.post('/verifyOTP', (req, res) => {
  const { email, otp } = req.body;

  // Check if the OTP provided by the user matches the one stored in the database
  connection.query('SELECT * FROM outing_requests WHERE email = ? AND otp = ?', [email, otp], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('Error verifying OTP');
      } else {
          if (result.length > 0) {
              // If OTP is verified successfully, you can perform further actions here
              // For example, you can update the user's status in the database or grant access to a restricted area
              res.status(200).send('OTP verified successfully');
          } else {
              // If OTP verification fails (OTP does not match), send an error response
              res.status(400).send('Invalid OTP');
          }
      }
  });
});



app.get('/pending-requests', (req, res) => {
  connection.query('SELECT * FROM outing_requests WHERE status = "pending"', (error, results) => {
    if (error) {
      console.error('Error fetching pending requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  });
});



app.get('/approved-requests', (req, res) => {
  connection.query('SELECT * FROM outing_requests WHERE status = "approved"', (error, results) => {
    if (error) {
      console.error('Error fetching pending requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
  
    res.json(results);
  });
});



app.post('/update-details/:id', (req, res) => {
  const { id } = req.params;
  const { checkInTime, checkOutTime, startDate, endDate, reason } = req.body;
  const status = "pending";
  const status2 = null;
  console.log("Received data:", {
    id: id,
    checkInTime: checkInTime,
    checkOutTime: checkOutTime,
    startDate: startDate,
    endDate: endDate,
    reason: reason
  });
 
  connection.query(
    'UPDATE outing_requests SET checkInTime = ?, checkOutTime = ?, startDate = ?, status=?,status2=?,endDate = ?, reason = ? WHERE id = ?',
    [checkInTime, checkOutTime, startDate,status,status2, endDate, reason, id],
    (error, results) => {
      if (error) {
        console.error('Error updating user details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      res.json({ message: 'User details updated successfully' });
    }
  );
  
});


app.get('/date-details/:id', (req, res) => {
  const { id } = req.params;
  connection.query('SELECT startDate, endDate FROM outing_requests WHERE id = ?',[id], (error, results) => {
    if (error) {
      console.error('Error fetching date details:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { startDate, endDate } = results[0];
    res.json({ startDate, endDate });
    
  });
});


// Get all approved requests
app.get('/approved-requests', (req, res) => {
  connection.query('SELECT * FROM outing_requests WHERE status = "approved"', (error, results) => {
    if (error) {
      console.error('Error fetching approved requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  });
});


app.get('/approved-requestsWarden', (req, res) => {
  connection.query('SELECT * FROM outing_requests WHERE status = "approved" AND status2 IS NULL', (error, results) => {
    if (error) {
      console.error('Error fetching approved requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  });
});


app.get('/approved-requests2', (req, res) => {
    connection.query('SELECT * FROM outing_requests WHERE status2 = "approved"', (error, results) => {
      if (error) {
        console.error('Error fetching approved requests:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      res.json(results);
    });
  });

// Get all rejected requests
app.get('/rejected-requests', (req, res) => {
  connection.query('SELECT * FROM outing_requests WHERE status = "rejected"', (error, results) => {
    if (error) {
      console.error('Error fetching rejected requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    
    res.json(results);
  });

});


app.get('/rejected-requests2', (req, res) => {
  connection.query('SELECT * FROM outing_requests WHERE status2 = "rejected"', (error, results) => {
    if (error) {
      console.error('Error fetching rejected requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  });
});


// Update status of an outing request to approved
app.put('/approve-request/:id', (req, res) => {
  const { id } = req.params;

  connection.query(
    'UPDATE outing_requests SET status = "approved" WHERE id = ?',
    [id],
    (error, results) => {
      if (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      res.json({ message: 'Request approved successfully' });
    }
  );
});


app.put('/approve-request2/:id', (req, res) => {
    const { id } = req.params;
  
    connection.query(
      'UPDATE outing_requests SET status2 = "approved" WHERE id = ?',
      [id],
      (error, results) => {
        if (error) {
          console.error('Error approving request:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
        res.json({ message: 'Request approved successfully' });
      }
    );
  });

  
  app.put('/cancel-request/:id', (req, res) => {
    const { id } = req.params;
  
    connection.query(
      'UPDATE outing_requests SET status = "cancelled" WHERE id = ?',
      [id],
      (error, results) => {
        if (error) {
          console.error('Error cancelling request:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
        res.json({ message: 'Request cancelled successfully' });
      }
    );
  });

   

app.put('/reject-request/:id', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Rejected reason is required' });
  }

  connection.query(
    'UPDATE outing_requests SET status = "rejected" ,rejected_reason=? WHERE id = ?',
    [reason, id],
    (error, results) => {
      if (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      connection.query(
        'INSERT INTO history (student_id, email, request_date, status) SELECT id, email, startDate, status FROM outing_requests WHERE id = ?',
        [reason, id],
        (error, results) => {
          if (error) {
            console.error('Error adding request to history:', error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }
          res.json({ message: 'Request rejected successfully' });
        }
      );
      res.json({ message: 'Request rejected successfully' });
    }
  );
});

app.put('/reject-request2/:id', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Rejected reason is required' });
  }
  
    connection.query(
      'UPDATE outing_requests SET status2 = "rejected",rejected_reason2=? WHERE id = ?',
      [reason,id],
      (error, results) => {
        if (error) {
          console.error('Error rejecting request:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }connection.query(
          'INSERT INTO history (student_id, email, request_date, status) SELECT id, email, startDate, status2 FROM outing_requests WHERE id = ?',
          [reason, id],
          (error, results) => {
            if (error) {
              console.error('Error adding request to history:', error);
              res.status(500).json({ error: 'Internal Server Error' });
              return;
            }
            res.json({ message: 'Request rejected successfully' });
          }
        );
       
        res.json({ message: 'Request rejected successfully' });
      }
    );
  });


// Route to fetch history data based on user ID
app.get('/history/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
      // Query to fetch history data based on user ID
      connection.query(
          'SELECT * FROM history WHERE student_id = ?',
          [userId],
          (error, results) => {
              if (error) {
                  console.error('Error fetching history data:', error);
                  res.status(500).json({ error: 'Internal Server Error' });
                  return;
              }
              res.json(results); // Send the fetched history data as response
          }
      );
  } catch (error) {
      console.error('Error fetching history data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});



const PORT = 3001;
app.listen(PORT, () => {
  console.log('Server is running on port ${PORT}');
});