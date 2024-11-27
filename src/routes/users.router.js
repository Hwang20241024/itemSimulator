// 라이브러리 import
import express from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 모듈 import
import { prisma } from '../utils/prisma/index.js';
import { PrismaClient } from '@prisma/client';
import authMiddleware  from '../middlewares/authHandler.js';
import CustomError from '../utils/errors/customError.js'
//import  error  from 'winston';

// 라우터 생성.
const router = express.Router();

// dotenv 사용.
dotenv.config();

/** 아이템시뮬레이터 - 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  //// 1. 리퀘스트의 바디 정보를 받는다.
  const { userName, password, confirmPassword } = req.body;

  //// 2. 이미 회원 가입한 회원인지 확인하자!
  // (아이디는 db에 "유니크"로 설정되어 있어 findUnique 함수를 사용했다.)
  const userExists = await prisma.accounts.findUnique({
    where: {
      userName: userName, // db에 Accounts 테이블에 "userName" 있는지 확인.
    },
  });
  // 2-1. 이미 있다면 회원가입은 하면안된다.
  if (userExists) {
    return next(new CustomError('이미 존재하는 ID 입니다.', 409));
  }

  //// 3. 아이디 형식을 보자.("영문 + 숫자" 조합이여야한다.)
  // 3-1. 음... pattern(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)는 영문 조합 검사 라고 한다.
  const isValidUserId = Joi.string().pattern(
    /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/
  ).required() ;
  const userNameSchema = isValidUserId.validate(userName);

  if (userNameSchema.error) {
    console.log(userNameSchema.error.details);
    return next(new CustomError('아이디는 영문,숫자 조합이여야합니다.', 422));
  }

  //// 4. 비밀번호.
  // 4-1. 비밀번호 길이 검증.
  const user_password  = Joi.string().min(6);
  const passwordSchema = user_password.validate(password);
  if (passwordSchema.error) {
    return next(new CustomError('비밀번호는 6자리 이상이어야 합니다.', 422));
  }

  // 4-2. 비밀번호 확인 검증.
  if (password !== confirmPassword) {
    return next(new CustomError('비밀번호를 확인해주세요.', 422));
  }

  // 4-3. 암호화
  const hashedPassword = await bcrypt.hash(password, 10);

  ////5. 토큰 발행하자.
  // const accessToken = createToken(
  //   userName,
  //   process.env.ACCESS_TOKEN_SECRET_KEY,
  //   '10s'
  // );
  const refreshToken = createToken(
    userName,
    process.env.REFRESH_TOKEN_SECRET_KEY,
    '7d'
  );

  // 5-1. 토큰을 보내자 'Authorization' 헤더로 Bearer 형식으로.
  // res.setHeader('Authorization', `Bearer ${accessToken}`);
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false });

  //// 6. 여기까지 오면 이상 없는 것. db에 회원 정보를 넣자
  try{
  await prisma.$transaction(
    async (tx) => {
      await tx.accounts.create({
        data: {
          userName: userName,
          password: hashedPassword,
          refreshToken: refreshToken,
        },
      });  
    },);
    global.refreshTokens[refreshToken] = userName;
    return res.status(201).json({message: '회원가입이 완료되었습니다.'})
  } catch(error){
    return next(new CustomError('회원가입 중 문제가 발생했습니다.', 500));
  }
});

/** Token을 생성하는 함수 **/
function createToken(userName, secret_key, time) {
  const accessToken = jwt.sign(
    { userName: userName }, // 데이터 삽입.
    secret_key, // Token "비밀"키
    { expiresIn: time } // 유지시간
  );

  return accessToken;
}

/** 아이템시뮬레이터 - 로그인 API **/
router.post("/sign-in", async (req, res, next) => {
  const { userName, password } = req.body;
  const user = await prisma.accounts.findFirst({ where: { userName } });

  // 로그인 검증.
  if (!user)
    return res.status(401).json({message: '존재하지 않는 이메일입니다.'})
  else if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({message: '비밀번호가 일치하지 않습니다.'})

  // 토큰 생성.
  const accessToken = createToken(
    userName,
    process.env.ACCESS_TOKEN_SECRET_KEY,
    '1s'
  );

  // 토큰 발행.
  res.setHeader('Authorization', `Bearer ${accessToken}`);

  return res.status(201).json({message: '로그인이 완료 되었습니다.'})
})

/** 아이템시뮬레이터 - 캐릭터 생성 API → (JWT 인증 필요) **/
router.post("/characters/add", authMiddleware, async (req, res, next) => {
  const { charactersName, stats, money } = req.body;

  return res.status(201).json({message: '테스트입니다.'})

})

export default router;