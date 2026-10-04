const nodemailer = require('nodemailer')
const dotenv = require('dotenv').config()


const transporter = nodemailer.createTransport({

    service: 'gmail',

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }

})


const sendVerificationEmail = async (email, token) => {

    const verificationLink =
        `http://127.0.0.1:5500/pages/verify-email.html?token=${token}`


    await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: email,

        subject: 'Verify your email - Quran School',

        html: `

            <h2>Welcome to Quran School</h2>

            <p>
                Please verify your email address
                by clicking the button below:
            </p>

            <a
                href="${verificationLink}"
                style="
                    display:inline-block;
                    padding:10px 20px;
                    background:#16a34a;
                    color:white;
                    text-decoration:none;
                    border-radius:6px;
                "
            >
                Verify Email
            </a>

            <p>
                This link will expire in 15 minutes.
            </p>

        `

    })

}


const sendResetPasswordEmail = async (email, token) => {

    const resetLink =
        `http://127.0.0.1:5500/pages/auth/reset-password.html?token=${token}`


    await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: email,

        subject: 'Reset your password - Quran School',

        html: `

            <h2>Password Reset</h2>

            <p>
                Click the button below to reset your password:
            </p>

            <a href="${resetLink}">
                Reset Password
            </a>

            <p>
                This link will expire in 15 minutes.
            </p>

        `

    })

}


module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail
}