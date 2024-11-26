<?php
// Set email address and subject
$email_to = 'your_email@example.com';
$email_subject = 'Contact Form Submission';

// Validate input data
$name = $_POST['name'];
$email = $_POST['email'];
$message = $_POST['message'];

$error_message = '';
$email_exp = '/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/';
if (!preg_match($email_exp, $email)) {
  $error_message .= 'The Email address you entered does not appear to be valid.';
}

$string_exp = "/^[A-Za-z .'-]+$/";
if (!preg_match($string_exp, $name)) {
  $error_message .= 'The Name you entered does not appear to be valid.';
}

if (strlen($message) < 2) {
  $error_message .= 'The Message you entered does not appear to be valid.';
}

if ($error_message != '') {
  problem($error_message);
} else {
  // Create email message
  $email_message = "Form details below.\r\n\r\n";
  $email_message .= "Name: " . $_POST['name'] . "\r\n";
  $email_message .= "Email: " . $_POST['email'] . "\r\n";
  $email_message .= "Message: " . $_POST['message'] . "\r\n";

  // Set email headers
  $headers = 'From: ' . $_POST['email'] . "\r\n" .
             'Reply-To: ' . $_POST['email'] . "\r\n" .
             'X-Mailer: PHP/' . phpversion();

  @mail($email_to, $email_subject, $email_message, $headers);
}

// Display success message
echo 'Thank you for contacting us. We will be in touch with you soon.';
?>