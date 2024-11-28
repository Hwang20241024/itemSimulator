// 라이브러리 import
import express from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 모듈 import
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/authHandler.js';
import CustomError from '../utils/errors/customError.js';


// 라우터 생성.
const router = express.Router();

// dotenv 사용.
dotenv.config();

/** 아이템시뮬레이터 - 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  const { userName, password, confirmPassword } = req.body;

  //// 1. 회원가입 하기전에 이미 가입되어있는지 확인 하는용.
  const userExists = await prisma.accounts.findUnique({
    where: {
      userName: userName, // db에 Accounts 테이블에 "userName" 있는지 확인.
    },
  });

  if (userExists) {
    return next(new CustomError('이미 존재하는 ID 입니다.', 409));
  }

  //// 2. 아이디 검증("영문 + 숫자" 조합이여야한다.)
  // pattern(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)는 영문 조합 검사.
  const isValidUserId = Joi.string()
    .pattern(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)
    .required();
  const userNameSchema = isValidUserId.validate(userName);

  if (userNameSchema.error) {
    console.log(userNameSchema.error.details);
    return next(new CustomError('아이디는 영문,숫자 조합이여야합니다.', 422));
  }

  //// 3. 비밀번호 확인 검증 및 암호화.
  const user_password = Joi.string().min(6);
  const passwordSchema = user_password.validate(password);
  if (passwordSchema.error) {
    return next(new CustomError('비밀번호는 6자리 이상이어야 합니다.', 422));
  }

  if (password !== confirmPassword) {
    return next(new CustomError('비밀번호를 확인해주세요.', 422));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  //// 4. 토큰 발행.
  const refreshToken = createToken(
    userName,
    process.env.REFRESH_TOKEN_SECRET_KEY,
    '7d'
  );

  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false });

  //// 5. 회원가입 정보 추가. 
  try {
    await prisma.$transaction(async (tx) => {
      await tx.accounts.create({
        data: {
          userName: userName,
          password: hashedPassword,
          refreshToken: refreshToken,
        },
      });
    });

    // 6. 인메모리에 refreshTokens 추가
    global.refreshTokens[refreshToken] = userName;
    
    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });

  } catch (error) {
    return next(new CustomError('회원가입 중 문제가 발생했습니다.', 500));
  }
});

/** Token을 생성하는 함수 **/
function createToken(userName, secret_key, time) {
  const accessToken = jwt.sign(
    { userName: userName }, // 데이터 삽입.
    secret_key,             // Token "비밀"키
    { expiresIn: time }     // 유지시간
  );

  return accessToken;
}

/** 아이템시뮬레이터 - 로그인 API **/
router.post('/sign-in', async (req, res, next) => {
  const { userName, password } = req.body;
  
  // 1. 유저 조회 
  const user = await prisma.accounts.findFirst({ 
    where: { 
      userName : userName,
    },
  });

  if (!user)
    return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });
  else if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

  // 2. 토큰 생성.
  const accessToken = createToken(
    userName,
    process.env.ACCESS_TOKEN_SECRET_KEY,
    '10m'
  );

  // 토큰 발행.
  res.setHeader('Authorization', `Bearer ${accessToken}`);

  return res.status(201).json({ message: '로그인이 완료 되었습니다.' });
});

/** 아이템시뮬레이터 - 캐릭터 생성 API → (JWT 인증 필요) **/
router.post('/characters/add', authMiddleware, async (req, res, next) => {
  const { charactersName, stats, money } = req.body;
  const { userName } = req.user;

  // 1. 유저 조회
  const account = await prisma.accounts.findUnique({
    where: { userName: userName },
  });

  if (!account) {
    return next(new CustomError('해당 계정이 존재하지 않습니다.', 404));
  }

  // 2. 케릭터 조회.
  const charactersExists = await prisma.characters.findUnique({
    where: {
      charactersName: charactersName, // db에 Accounts 테이블에 "userName" 있는지 확인.
    },
  });
  
  if (charactersExists) {
    return next(new CustomError('이미 존재하는 케릭터 입니다.', 409));
  }

  // 3. 케릭터 생성.
  const newCharacter = await prisma.characters.create({
    data: {
      accountsId: account.accountsId,
      charactersName: charactersName,
      money: money, // 초기 돈
    },
  });

  // 4. 케릭터 능력치 추가
  const newCharacterStats = await prisma.charactersStats.create({
    data: {
      characterId: newCharacter.characterId,
      stats: stats, // 기본 능력치 추가
    },
  });

  return res.status(201).json({
      message: account,
      character: newCharacter,
      stats: newCharacterStats,
    });
});

/** 아이템시뮬레이터 - 캐릭터 삭제 API → (JWT 인증 필요) **/
router.delete(
  '/characters/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params;
    const { userName } = req.user;

    // 1. 케릭터 조회.
    const charactersExists = await prisma.characters.findUnique({
      where: {
        characterId: +characterId,
      },
    });
    if (!charactersExists) {
      return next(new CustomError('삭제할 케릭터가 없습니다.', 409));
    }

    // 2. 유저 조회.
    const account = await prisma.accounts.findUnique({
      where: { userName: userName },
    });

    // 3. 다른계정 케릭터는 삭제 불가.
    if (account.accountsId !== charactersExists.accountsId) {
      return next(
        new CustomError('다른계정의 케릭터는 삭제 할수 없습니다.', 409)
      );
    }

    // 4. 케릭터 삭제.
    const deletedCharacter = await prisma.characters.delete({
      where: {
        characterId: +characterId, 
      },
    });

    return res
      .status(201)
      .json({ message: '삭제 완료.', characters: deletedCharacter });
  }
);

/** 아이템시뮬레이터 - 캐릭터 상세 조회 API **/
router.get('/characters/:characterId', async (req, res, next) => {
  const { characterId } = req.params; 
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer 토큰에서 값 추출
  let userName = '';


  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);
      userName = decoded.userName; // 토큰에서 사용자 이름 추출
    } catch (error) {
      console.log('유효하지 않은 토큰입니다.');
    }
  }


  const character = await prisma.characters.findUnique({
    where: {
      characterId: +characterId,
    },
    include: {
      charactersStats: {
        select: {
          stats: true, // 능력치 포함
        },
      },
    },
  });

  if (!character) {
    return next(new CustomError('선택한 케릭터가 없습니다.', 409));
  }


  const account = await prisma.accounts.findUnique({
    where: { accountsId: character.accountsId },
  });

  if (!account) {
    return next(new CustomError('해당 계정이 존재하지 않습니다.', 404));
  }


  const isOwner = userName && account.userName === userName; 
  const response = {
    charactersName: character.charactersName,
    ...character.charactersStats.stats, 
  };

  if (isOwner) {
    response.money = character.money;
  }

  return res.status(200).json(response);
});

export default router;
