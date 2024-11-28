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

/** 아이템시뮬레이터 - 인벤토리 API → (JWT 인증 필요) **/
router.get('/inv/:characterId', authMiddleware, async (req, res, next) => {
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
        select: {
          characterId: true,
        },
      });

      // 2-2. 케릭터가 없다면?
      if (!character) {
        throw new CustomError('본인의 케릭터로 접속해주세요.', 409);
      }

      //// 3. 인벤토리에 아이템 있는지 없는지 확인.
      const inventories = await prisma.characterInventories.findMany({
        where: {
          characterId: character.characterId,
        },
        include: {
          items: {
            select: {
              itemName: true,
              itemId: true,
            },
          },
        },
      });

      // 3-1. 인벤토리에 해당 아이템이 없는 경우
      if (!inventories) {
        throw new CustomError(`[아이템]을 가지고 있지 않습니다.`, 409);
      }

      // 3-2. 원하는 형태로 데이터 구조 변경
      const response = inventories.map((inventory) => ({
        item_code: inventory.items.itemId,
        item_name: inventory.items.itemName,
        count: inventory.count,
      }));

      return response;
    });

    return res.status(200).json(transaction);
  } catch (error) {
    console.log(error);
    return next(error);
  }
});

/** 아이템시뮬레이터 - 캐릭터가 장착한 아이템 목록 조회 API **/
router.get('/inv/:characterId/equipped-items', async (req, res, next) => {
  const { characterId } = req.params; // URL 파라미터 가져와!

  try {
    const transaction = await prisma.$transaction(async (prisma) => {
      //// 1. 케릭터를 가져오자.
      // 1-1. 필요한거는 케릭터 ID
      const character = await prisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
        select: {
          characterId: true,
        },
      });

      // 1-2. 케릭터가 없다면?
      if (!character) {
        throw new CustomError('본인의 케릭터로 접속해주세요.', 409);
      }

      const characterEquippedItems =
        await prisma.CharacterEquippedItems.findMany({
          where: {
            characterId: character.characterId,
          },
          include: {
            characterInventories: {
              include: {
                items: {
                  select: {
                    itemName: true,
                    itemId: true,
                  },
                },
              },
            },
          },
        });

      // characterInventories가 배열이 아니면, 객체로 처리할 수 있도록 수정
      const itemDetails = characterEquippedItems.flatMap((equippedItem) => {
        // characterInventories가 배열이라면 map을 사용하고, 아니면 바로 처리
        if (Array.isArray(equippedItem.characterInventories)) {
          return equippedItem.characterInventories.map((inventory) => ({
            itemName: inventory.items.itemName,
            itemId: inventory.items.itemId,
          }));
        } else {
          // 객체일 경우 직접 처리
          return [
            {
              itemName: equippedItem.characterInventories.items.itemName,
              itemId: equippedItem.characterInventories.items.itemId,
            },
          ];
        }
      });

      return itemDetails;
    });
    return res.status(200).json(transaction);
  } catch (error) {
    console.log(error);
    return next(error);
  }
});

/** 아이템시뮬레이터 - 아이템 장착 API  → (JWT 인증 필요) **/
router.post(
  '/inv/:characterId/equip',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params; 
    const { userName } = req.user; 
    const { itemId } = req.body; 

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
          throw new CustomError('본인의 케릭터로 접속해주세요.', 409);
        }

        //// 3. 인벤토리에 아이템 있는지 없는지 확인.
        const inventories = await prisma.characterInventories.findFirst({
          where: {
            characterId: character.characterId,
            itemId: +itemId,
          },
          include: {
            items: {
              include: {
                itemStats: {
                  select: {
                    stats: true,
                  },
                },
              },
            },
          },
        });

        // 3-1. 아이템이 없다면?
        if (!inventories) {
          throw new CustomError('장착할 아이템이 없습니다.', 409);
        }

        //// 4. 장비를 장착하자
        // 4-1. 중복 장착을 감지 하자.
        const equipItem = await prisma.characterEquippedItems.findFirst({
          where: {
            characterInventoriesId: inventories.characterInventoriesId,
            characterId: character.characterId,
            itemId: +itemId,
          },
        });

        // 4-2. 없으면 장착하자.
        if (!equipItem) {
          await prisma.characterEquippedItems.create({
            data: {
              characterInventoriesId: inventories.characterInventoriesId,
              characterId: character.characterId,
              itemId: +itemId,
            },
          });
        } else {
          throw new CustomError('이미 아이템을 장착했습니다.', 409);
        }

        //// 5. 인벤토리에서 삭제하자.
        // 5-1. 아이템을 여러개 가지고 있나 확인 여러개 있으면 업데이트 1개면 삭제.
        if (inventories.count >= 2) {
          await prisma.characterInventories.update({
            where: {
              characterInventoriesId: inventories.characterInventoriesId,
            },
            data: {
              count: inventories.count - 1,
            },
          });
        } else {
          await prisma.characterInventories.delete({
            where: {
              characterInventoriesId: inventories.characterInventoriesId,
            },
          });
        }
        
        //// 6. 케릭터 능력치 업데이트
        const updateStats = {
          power:
            character.charactersStats.stats['power'] +
            inventories.items.itemStats.stats['power'],
          health:
            character.charactersStats.stats['health'] +
            inventories.items.itemStats.stats['health'],
        };

        const updateCharacters = await prisma.characters.update({
          where: { characterId: character.characterId },
          data: {
            charactersStats: {
              update: {
                stats: updateStats,
              },
            },
          },
          include: {
            charactersStats: true, // charactersStats를 포함
          },
        });

        const beforeData = {
          health: character.charactersStats.stats['power'],
          power: character.charactersStats.stats['health'],
        };

        const afterData = {
          health: updateCharacters.charactersStats.stats['power'],
          power: updateCharacters.charactersStats.stats['health'],
        };

        // updateCharacters를 제외한 나머지는 업데이트 및 삭제 이전에 불러온 데이터.
        return {
          BEFORE: beforeData,
          ITEMNAME: inventories.items.itemName,
          AFTER: afterData,
        };
      });
      return res.status(200).json(transaction);
    } catch (error) {
      console.log(error);
      return next(error);
    }
  }
);

/** 아이템시뮬레이터 - 캐릭터가 장착한 아이템 목록 조회 API **/
router.delete(
  '/inv/:characterId/unequip',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params; // URL 파라미터 가져와!
    const { userName } = req.user; // 토큰 정보 가져오세요~
    const { itemId } = req.body; // 바디에서 정보 가져오세요.

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
          throw new CustomError('본인의 케릭터로 접속해주세요.', 409);
        }

        //// 3.장착 아이템 있는지 없는지 확인.
        const equipInventories = await prisma.characterEquippedItems.findFirst({
          where: {
            characterId: character.characterId,
            itemId: +itemId,
          },
          include: {
            characterInventories: {
              include: {
                items: {
                  include:{
                    itemStats:{
                      select: {
                        stats: true,
                      },  
                    }
                  },
                },
              },
            },
          },
        });

        // 3-1. 헤제할 아이템이 없다면?
        if (!equipInventories) {
          throw new CustomError('헤재할 아이템이 없습니다.', 409);
        }

        //// 4. 남은 경우의 수는 헤제 밖에없다.
        await prisma.characterEquippedItems.delete({
          where: {
            characterEquippedItemId: equipInventories.characterEquippedItemId,
          },
        });

        //// 5. 케릭터의 능력치를 뺴자.
        const updateStats = {
          power:
            character.charactersStats.stats['power'] -
            equipInventories.characterInventories.items.itemStats.stats['power'],
          health:
            character.charactersStats.stats['health'] -
            equipInventories.characterInventories.items.itemStats.stats['health'],
        };

        const updateCharacters = await prisma.characters.update({
          where: { characterId: character.characterId },
          data: {
            charactersStats: {
              update: {
                stats: updateStats,
              },
            },
          },
          include: {
            charactersStats: true, // charactersStats를 포함
          },
        });

        //// 6. 인벤토리에 아이템 추가.
        // 6-1. 인벤토리에 있는지 일단확인하자.
        const inventories = await prisma.characterInventories.findFirst({
          where: {
            characterId: character.characterId,
            itemId: +itemId,
          },
        });
        // 6-2. 인벤토리에 해당 아이템이 있다면 업데이트 아니면 새로추가
        if(!inventories){
          await prisma.characterInventories.create({
            data: {
              characterId: inventories.characterInventoriesId,
              itemId: +itemId,
              count: 1,
            },
          });
        } else {
          await prisma.characterInventories.update({
            where: {
              characterInventoriesId: equipInventories.characterInventoriesId,
            },
            data: {
              count: inventories.count + 1,
            },
          });
        }

        
        const beforeData = {
          health: character.charactersStats.stats['power'],
          power: character.charactersStats.stats['health'],
        };

        const afterData = {
          health: updateCharacters.charactersStats.stats['power'],
          power: updateCharacters.charactersStats.stats['health'],
        };

        // equipInventories를 제외한 나머지는 업데이트 및 삭제 이전에 불러온 데이터.
        return {
          BEFORE: beforeData,
          ITEMNAME: equipInventories.characterInventories.items.itemName,
          AFTER: afterData,
        };

      });
      return res.status(200).json(transaction);
    } catch (error) {
      console.log(error);
      return next(error);
    }
  }
);

export default router;

