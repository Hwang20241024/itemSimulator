// 라이브러리 import
import express from 'express';
import dotenv from 'dotenv';

// 모듈 import
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/authHandler.js';
import CustomError from '../utils/errors/customError.js';


// 라우터 생성.
const router = express.Router();

// dotenv 사용.
dotenv.config();

/** 게임 머니를 버는 API → (JWT 인증 필요) **/
router.get(
  '/earn-money/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params; // URL 파라미터 가져와!
    const { userName } = req.user; // 토큰 정보 가져오세요~

    try {
      const transaction = await prisma.$transaction(async (prisma) => {
        //// 1.유저을 가져오자
        const account = await prisma.accounts.findUnique({
          where: { userName: userName },
        });

        // 1-1. 유저 예외처리
        if (!account) {
          throw new CustomError('해당 계정이 존재하지 않습니다.', 404);
        }

        //// 2. 케릭터를 가져오자.
        // 2-1. 필요한거는 케릭터 ID
        const character = await prisma.characters.findFirst({
          where: {
            characterId: +characterId,
            accountsId: account.accountsId,
          },
          include: {
            charactersStats: {
              select: {
                stats: true,
              },
            },
          },
        });

        // 2-2. 케릭터가 없다면?
        if (!character) {
          throw new CustomError('해당유저는 케릭터가 없습니다.', 409);
        }

        //// 3. 돈을 추가하자.
        const updateCharacter = await prisma.characters.update({
          where: { characterId: character.characterId },
          data: {
            money: character.money + 100,
          },
        });
        return `[100]원이 획득하였습니다. [가지고있는 돈 : ${updateCharacter.money} ]`
      });
      return res.status(200).json(transaction);
    } catch (error) {
      console.log(error);
      return next(error);
    }

  }
);

export default router;
