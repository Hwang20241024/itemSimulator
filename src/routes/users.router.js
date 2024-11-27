// 라이브러리 import
import express from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 모듈 import
import { prisma } from '../utils/prisma/index.js';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middlewares/authHandler.js';
import CustomError from '../utils/errors/customError.js'
import { error } from 'winston';

// 라우터 생성.
const router = express.Router();

// dotenv 사용.
dotenv.config();

/** 아이템시뮬레이터 - 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  //// 1. 리퀘스트의 바디 정보를 받는다.
  const { username, password } = req.body;

  //// 2. 이미 회원 가입한 회원인지 확인하자!
  // (아이디는 db에 "유니크"로 설정되어 있어 findUnique 함수를 사용했다.)
  const userExists = await prisma.accounts.findUnique({
    where: {
      username: username, // db에 Accounts 테이블에 "username" 있는지 확인.
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
  const userNameSchema  = isValidUserId.validate(username);

  if (userNameSchema.error) {
    console.log(userNameSchema.error.details);
    return next(new CustomError('아이디는 영문,숫자 조합이여야합니다.', 422));
  }

  /// 4. 비밀번호를 암호화 하자.
  const hashedPassword = await bcrypt.hash(password, 10);

  ////5. 토큰 발행하자.
  const accessToken = createToken(
    username,
    process.env.ACCESS_TOKEN_SECRET_KEY,
    '10s'
  );
  const refreshToken = createToken(
    username,
    process.env.REFRESH_TOKEN_SECRET_KEY,
    '7d'
  );

  // 5-1. 토큰을 보내자 'Authorization' 헤더로 Bearer 형식으로.
  res.setHeader('Authorization', `Bearer ${accessToken}`);
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false });

  //// 6. 여기까지 오면 이상 없는 것. db에 회원 정보를 넣자
  try{
  await prisma.$transaction(
    async (tx) => {
      await tx.accounts.create({
        data: {
          username: username,
          password: hashedPassword,
          refreshToken: refreshToken,
        },
      });  
    },);
    return res.status(201).json({message: '회원가입이 완료되었습니다.'})
  } catch(error){
    return next(new CustomError('회원가입 중 문제가 발생했습니다.', 500));
  }
});

/** Token을 생성하는 함수 **/
function createToken(username, secret_key, time) {
  const accessToken = jwt.sign(
    { username: username }, // 데이터 삽입.
    secret_key, // Token "비밀"키
    { expiresIn: time } // 유지시간
  );

  return accessToken;
}
