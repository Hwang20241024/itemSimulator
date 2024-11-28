// 라이브러리 import
import express from 'express';
import dotenv from 'dotenv';

// 모듈 import
import { prisma } from '../utils/prisma/index.js';
import CustomError from '../utils/errors/customError.js';

// 라우터 생성.
const router = express.Router();

// dotenv 사용.
dotenv.config();

/* 아이템시뮬레이터 - 아이템 생성 API */
router.post('/items/add', async (req, res, next) => {
  const { itemName, stats, price } = req.body;

  // 1. 아이템 검증.
  const itemExists = await prisma.items.findFirst({ 
    where: {
      itemName: itemName, // db에 Accounts 테이블에 "userName" 있는지 확인.
    },
  });

  if (itemExists) {
    return next(new CustomError('이미 존재하는 아이템 입니다.', 409));
  }

  // 2. 아이템 생성.
  const newItem = await prisma.items.create({
    data: {
      itemName: itemName,
      price: price, 
    },
  });

  // 3. 아이템 능력 수정.
  await prisma.itemStats.create({
    data: {
      itemId: newItem.itemId,
      stats: stats, 
    },
  });

  return res.status(201).json({message: ` [${newItem.itemName}] 아이템 생성 완료.`, } )
});

/** 아이템시뮬레이터 - 아이템 수정 API **/
router.patch("/items/update/:itemId", async (req, res, next) => {
  const {itemId} = req.params;
  const { itemName, stats } = req.body;

  // 1. 아이템 검증.
  const temp = await prisma.items.findFirst({ 
    where: {
      itemId: +itemId, // db에 Accounts 테이블에 "userName" 있는지 확인.
    },
  });

  if(!temp) {
    return next(new CustomError('존재하지 않는 아이템입니다.', 409));
  }

  // 2. 아이템 내용 수정.
  const itemExists = await prisma.items.update({
    where: {
      itemId: +itemId, 
    },
    data:{
      itemName: itemName
    },
    
  });

  // 3. 아이템 스텟 수정.
  const itemStatsExists = await prisma.itemStats.update({
    where: {
      itemId: +itemExists.itemId, 
    },
    data: {
      stats: stats, 
    },
  });

  return res.status(201).json({message: ` [${itemExists.itemName}] 아이템 수정 완료.`, } )

})

/** 아이템시뮬레이터 - 아이템 목록 조회 API **/
router.get("/items/get", async (req, res, next) => {

  // 1. 아이템 조회
  const getItems = await prisma.items.findMany({
    select: {
      itemId: true,
      itemName: true,
      price: true
    }
  });

  return res.status(201).json(getItems)

})

/** 아이템시뮬레이터 - 아이템 상세 조회 API **/
router.get("/items/get/:item", async (req, res, next) => {
  const { item } = req.params;

  // 1. 아이템 조회
  const getItem = await prisma.items.findFirst({
    where: {
      itemId: +item , // db에 Accounts 테이블에 "userName" 있는지 확인.
    },
    include: {
      itemStats: {
        select: {
          stats: true, // 능력치 포함
        },
      },
    },
  });

  if(!getItem) {
    return next(new CustomError('없는 아이템입니다.', 409));
  }

  // 2. 리스폰 데이터구조 변경.
  const itemData  = {
    itemId: getItem.itemId,
    itemName: getItem.itemName,
    stats: getItem.itemStats ? getItem.itemStats.stats : {}, 
    price: getItem.price
  };

  return res.status(201).json(itemData )

})

export default router;
