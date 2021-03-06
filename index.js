const express = require("express");
const passport = require("passport");
const boom = require("@hapi/boom");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const helmet = require("helmet");
const cors = require("cors");

const { config } = require("./config");

const app = express();
app.use(
  cors({
    credentials: true,
    origin: ["https://rexguzman.github.io", "http://localhost:8080"],
    method: "GET,HEAD,PUT,PATCH,POST,DELETE",
  })
);

// body parser
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

//  Basic strategy
require("./utils/auth/strategies/basic");

// OAuth strategy
require("./utils/auth/strategies/oauth");

//-------> Auth Routes
app.post("/auth/sign-in", async function (req, res, next) {
  passport.authenticate("basic", function (error, data) {
    try {
      if (error || !data) {
        next(boom.unauthorized());
      }

      req.login(data, { session: false }, async function (err) {
        if (err) {
          next(err);
        }

        const { token, ...user } = data;

        res.cookie("token", token, {
          httpOnly: !config.dev,
          secure: !config.dev,
        });
        res.status(200).json(data);
      });
    } catch (err) {
      next(err);
    }
  })(req, res, next);
});

app.post("/auth/sign-up", async function (req, res, next) {
  const { body: user } = req;

  try {
    await axios({
      url: `${config.apiUrl}/api/auth/sign-up`,
      method: "post",
      data: {
        email: user.email,
        name: user.name,
        password: user.password,
      },
    });

    res.status(201).json({
      name: req.body.name,
      email: req.body.email,
      //id: userData.data.id
    });
  } catch (error) {
    next(error);
  }
});

//-------> user to-dos Routes
app.get("/to-dos/:userId", async function (req, res, next) {
  try {
    const { token } = req.cookies;
    const { userId } = req.params;
    console.log(token);
    const userToDos = await axios({
      url: `${config.apiUrl}/api/user-to-dos/${userId}`,
      headers: { authorization: `Bearer ${token}` },
      method: "get",
    });
    res.status(200).json(userToDos.data);
  } catch (error) {
    next(error);
  }
});

app.post("/user-to-dos", async function (req, res, next) {
  try {
    const { body: userToDo } = req;
    const { token } = req.cookies;
    console.log(token);

    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-to-dos`,
      headers: { Authorization: `Bearer ${token}` },
      method: "post",
      data: userToDo,
    });

    if (status !== 201) {
      return next(boom.badImplementation());
    }

    res.status(201).json({ _id: data.toDoId, ...userToDo });
  } catch (error) {
    next(error);
  }
});

app.put("/user-to-dos", async function (req, res, next) {
  try {
    const { body: userToDo } = req;
    const { token } = req.cookies;
    console.log(token);

    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-to-dos`,
      headers: { Authorization: `Bearer ${token}` },
      method: "put",
      data: userToDo,
    });
    if (status !== 200) {
      return next(boom.badImplementation());
    }

    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

app.put("/user-to-dos/completed", async function (req, res, next) {
  try {
    const { body: userToDo } = req;
    const { token } = req.cookies;
    console.log(token);

    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-to-dos/completed`,
      headers: { Authorization: `Bearer ${token}` },
      method: "put",
      data: userToDo,
    });
    if (status !== 200) {
      return next(boom.badImplementation());
    }

    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

app.delete("/user-to-dos/:toDoId", async function (req, res, next) {
  try {
    const { toDoId } = req.params;
    const { token } = req.cookies;
    console.log(token);
    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-to-dos/${toDoId}`,
      headers: { Authorization: `Bearer ${token}` },
      method: "delete",
    });

    if (status !== 200) {
      return next(boom.badImplementation());
    }

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

//-------> Google Auth Routes
app.get(
  "/auth/google-oauth",
  passport.authenticate("google-oauth", {
    scope: ["email", "profile", "openid"],
  })
);

app.get(
  "/auth/google-oauth/callback",
  passport.authenticate("google-oauth", { session: false }),
  function (req, res, next) {
    if (!req.user) {
      next(boom.unauthorized());
    }
    const { token, ...user } = req.user;
    res
      .cookie("token", token, {
        httpOnly: !config.dev,
        secure: !config.dev,
      })
      .cookie("name", req.user.user.name)
      .cookie("id", req.user.user.id)
      .cookie("email", req.user.user.email);

    res.status(200).redirect(`${config.clientUrl}/#/google/auth`);
  }
);

app.get("/auth/success", function (req, res, next) {
  if (
    req.cookies.name === "" ||
    req.cookies.email === "" ||
    req.cookies.id === ""
  ) {
    next(boom.unauthorized());
  } else if (req.cookies) {
    res.json({
      message: "User Authenticated",
      user: req.cookies,
    });
  }
});

app.listen(config.port, function () {
  console.log(`Listening http://localhost:${config.port}`);
});
