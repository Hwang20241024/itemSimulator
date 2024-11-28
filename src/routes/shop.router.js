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

/** 아이템시뮬레이터 - 아이템 구입 API → (JWT 인증 필요) **/
router.post(
  '/shop/buy/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const itemCodes = req.body.map((item) => item.item_code);
    const counts = req.body.map((item) => item.count);
    const { userName } = req.user;
    const { characterId } = req.params;

    //// 1.유저을 가져오자
    const account = await prisma.accounts.findUnique({
      where: { userName: userName },
    });

    // 1-1. 유저 예외처리
    if (!account) {
      return next(new CustomError('해당 계정이 존재하지 않습니다.', 404));
    }

    //// 2. 케릭터를 가져오자.
    // 2-1. 필요한거는 돈이랑 케릭터 ID
    const character = await prisma.characters.findFirst({
      where: {
        characterId: +characterId,
        accountsId: account.accountsId,
      },
      select: {
        characterId: true,
        money: true,
      },
    });

    // 2-2. 케릭터가 없다면?
    if (!character) {
      return next(new CustomError('본인의 케릭터로 접속해주세요.', 409));
    }

    // 2-3. 케릭터가 돈이 없다면?
    if (character.money <= 0) {
      return next(new CustomError('케릭터가 돈이 없다네요.', 409));
    }

    ////3. 아이템을 구입하자.
    // 3-1. 아이템 코드 기준으로 반복문 돌리자.
    try {
      await prisma.$transaction(async (prisma) => {
        for (let i = 0; i < itemCodes.length; i++) {
          // req.body 정보를 가져오자.
          const item = itemCodes[i];
          const countValue = +counts[i];

          // 아이템 검증.
          const getItems = await prisma.items.findFirst({
            where: {
              itemName: item,
            },
          });

          if (!getItems) {
            throw new CustomError('아이템이 없습니다.', 409);
          }

          // 케릭터 정보를 갱신
          const updateCharacter = await prisma.characters.findFirst({
            where: {
              characterId: character.characterId,
            },
          });

          // 돈이 부족한가?
          if (getItems.price * countValue > character.money) {
            throw new CustomError('돈이 부족합니다.', 409);
          }

          // 아이템이 존재하는가?
          const getInventories = await prisma.characterInventories.findFirst({
            where: {
              itemId: getItems.itemId, 
              characterId: updateCharacter.characterId,
            },
          });

          // 아이템이 존재하면 업데이트.
          if (getInventories) {
            await prisma.characterInventories.update({
              where: {
                characterInventoriesId: getInventories.characterInventoriesId,
              },
              data: {
                count: getInventories.count + countValue,
              },
            });
          } else {
            // 없다면 새로 만들기
            await prisma.characterInventories.create({
              data: {
                characterId: updateCharacter.characterId,
                itemId: getItems.itemId,
                count: countValue,
              },
            });
          }

          // 아이템 구매후 케릭터 머니 차감
          await prisma.characters.update({
            where: { characterId: updateCharacter.characterId },
            data: {
              money: updateCharacter.money - getItems.price * countValue,
            },
          });
        }
      });
      return res.status(201).json({ message: '아이템 구매가 완료되었습니다.' });
    } catch (error) {
      return next(error); // catch에서 예외 처리
    }
  }
);

/** 아이템시뮬레이터 - 아이템 판매 API → (JWT 인증 필요) **/
router.delete(
  '/shop/sell/:characterId/:item/:count',
  authMiddleware,
  async (req, res, next) => {
    const { characterId, item, count } = req.params; // URL 파라미터 가져와!
    const { userName } = req.user; // 토큰 정보 가져오세요~

    let output_ItmeName;
    let output_Money;
    let output_Count;

    try {
      const transaction = await prisma.$transaction(async (prisma) => {
        //// 1.유저 조회
        const account = await prisma.accounts.findUnique({
          where: { userName: userName },
        });

        if (!account) {
          throw new CustomError('해당 계정이 존재하지 않습니다.', 404);
        }

        //// 2. 케릭터 조회
        // 2-1. 필요한거는 돈이랑 케릭터 ID
        const character = await prisma.characters.findFirst({
          where: {
            characterId: +characterId,
            accountsId: account.accountsId,
          },
          select: {
            characterId: true,
            money: true,
          },
        });

        // 2-2. 케릭터가 없다면?
        if (!character) {
          throw new CustomError('본인의 케릭터로 접속해주세요.', 409);
        }

        //// 3. 인벤토리에 아이템 있는지 없는지 확인.
        const inventories = await prisma.characterInventories.findFirst({
          where: {
            characterId: character.characterId,
            itemId: +item,
          },
        });

        // 3-1. 인벤토리에 해당 아이템이 없는 경우
        if (!inventories) {
          throw new CustomError(`[아이템]을 가지고 있지 않습니다.`, 409);
        }

        //// 4. 아이템 정보 가져오자.
        const getItems = await prisma.items.findFirst({
          where: {
            itemId: +item, 
          },
        });

        // 4-1. 아이템 검증.
        if (!getItems) {
          throw new CustomError('아이템이 없습니다.', 409);
        }

        //// 5. 삭제하자.
        // 5-1 만약 내가 팔려고 하는 수량이 아이템 갯수보다 더많다면.
        let updatedCount = 0;
        if (count >= inventories.count) {
          updatedCount = inventories.count;
          await prisma.characterInventories.delete({
            where: {
              characterInventoriesId: inventories.characterInventoriesId,
            },
          });
        } else {
          updatedCount = Number(count);
          await prisma.characterInventories.update({
            where: {
              characterInventoriesId: inventories.characterInventoriesId,
            },
            data: {
              count: inventories.count - updatedCount,
            },
          });
        }

        //// 6. 케릭터 돈추가
        // 아이템 구매후 케릭터 머니 차감
        const temp = await prisma.characters.update({
          where: { characterId: character.characterId },
          data: {
            money: character.money + getItems.price * 0.6 * updatedCount,
          },
        });

        output_ItmeName = getItems.itemName;
        output_Money = temp.money;
        output_Count = updatedCount;
      });

      return res
        .status(201)
        .json({
          message: `[${output_ItmeName}]을 [${output_Count}]개 판매하셨습니다. 남은돈 [${output_Money}]`,
        });
    } catch (error) {
      console.log(error);
      return next(error); 
    }
  }
);

export default router;
