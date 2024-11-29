## 질문과 답변 

# 암호화 방식
1. 질문 : 비밀번호를 DB에 저장할 때 Hash를 이용했는데, Hash는 단방향 암호화와 양방향 암호화 중 어떤 암호화 방식에 해당할까요?

답변: Hash는 "단방향 암호화"입니다.

- 단방향 암호화: 입력값을 고정된 길이의 해시 값으로 변환하며, 이 값을 원래의 입력값으로 되돌릴 수 없습니다.
--SHA-256, bcrypt 등.

- 양방향 암호화: 암호화된 데이터를 복호화하여 원본 데이터를 복구할 수 있는 방식입니다
--예: AES, RSA 등.

2. 질문 : 비밀번호를 그냥 저장하지 않고 Hash 한 값을 저장 했을 때의 좋은 점은 무엇인가요?

답변: 데이터 유출에 대비 할 수 있습니다. 

# 인증 방식
1. 질문 : 인증과 인가가 무엇인지 각각 설명해 주세요.

답변: 인증은 "사용자가 누구인지 확인"
      인가는 "확인된 사용자의 권환을 제어"

2. 질문 : 위 API 구현 명세에서 인증을 필요로 하는 API와 그렇지 않은 API의 차이가 뭐라고 생각하시나요?

답변: 제한 없이 접근하면 신뢰성을 보장할수 없기 때문입니다.


3. 질문 : 아이템 생성, 수정 API는 인증을 필요로 하지 않는다고 했지만 사실은 어느 API보다도 인증이 필요한 API입니다. 왜 그럴까요?

답변: 아이템은 치명적이지 않아서 그럴꺼 같습니다. 

# Http Status Code
1. 과제를 진행하면서 사용한 Http Status Code를 모두 나열하고, 각각이 의미하는 것과 어떤 상황에 사용했는지 작성해 주세요.

- 201: 클라이언트의 요청이 성공적으로 처리되어 새로운 리소스가 생성되었음을 나타냅니다.

- 401 : 토큰이 유효하지 않거나 잘못된 경우, 사용자가 인증되지 않았다고 판단

- 409 :  클라이언트의 요청이 서버의 현재 상태와 충돌하는 경우에 사용됩니다.

- 422 : 데이터 검증 오류나 잘못된 입력을 나타낼 때 사용


답변: 409를 가장 많이 사용한거 같습니다. 422는 회원가입때 사용했고. 201은 성공했을때 주로 사용하였습니다.  401은 로그인할때 사용했습니다.


# 게임 경제

1. 질문: 현재는 간편한 구현을 위해 캐릭터 테이블에 money라는 게임 머니 컬럼만 추가하였습니다.

1-1. 이렇게 되었을 때 어떠한 단점이 있을 수 있을까요?
답변 : 확장성이 부족 할 것 같고 관리하는게 복잡할 것 같습니다.

1-2. 이렇게 하지 않고 다르게 구현할 수 있는 방법은 어떤 것이 있을까요?
답변 : 일단 테이블을 나누고 게임머니가 너무 많이 바뀐다면 인메모리 방식으로 구현을 할 것 같습니다.  

2. 질문: 아이템 구입 시에 가격을 클라이언트에서 입력하게 하면 어떠한 문제점이 있을 수 있을까요?
답변 : 악의적인 사용자가 가격을 인위적으로 낮추거나 무료로 구입할 수 있을 것 같습니다.

## 어려웠던 점. 
이번 프로젝트에서는 많은 휴먼 에러가 발생했습니다. API 테스트 중에도 종종 Body를 보내지 않았으면서 코드를 계속 확인하는 실수를 했습니다. 데이터베이스도 복잡해서 조금 더 시간이 있었으면 좋았을 것 같다는 생각도 들었습니다. 그럼에도 불구하고, 전체적으로는 재미있게 진행할 수 있었습니다.


## api 

# 유저
1. /sign-up (회원가입) -POST
2. /sign-in (로그인)   -POST

# 케릭터
1. /characters/add (케릭터 생성) -POST
2. /characters/:characterId (케릭터 삭제) -DEL
3. /characters/:characterId (케릭터 상세 조회) -GET

# 아이템
1. /items/add (아이템 생성) -POST
2. /items/update/:itemId (아이템 수정.) -PTCH
3. /items/get/:item (아이템 상세 조회) -GET
4. /items/get (아이템 목록 조회) -GET

# 인벤토리
1. /inv/:characterId (인벤토리) -GET
2. /inv/:characterId/equip (아이템장착) -POST
3. /inv/:characterId/unequip(아이템헤제) -DEL
4. /inv/:characterId/equipped-items (장착한 아이템 목록) -GET

# 상점
1. /shop/sell/:characterId/:item/:count (아이템 판매) -DEL
2. /shop/buy/:characterId (아이템 구입) -POST


# 기타
1. /earn-money/:characterId (게임 머니 벌기) -GET



## api - body

1. /sign-up (회원가입) -POST

{
	"userName": 	   "test5",
	"password": 	   "555555",
	"confirmPassword": "555555"
}


2. /sign-in (로그인)   -POST

{
	"userName": 			 "test1",
	"password": 			 "111111"
}


3. /characters/add (케릭터 생성) -POST

{
	"charactersName": "황2",
	"stats": {"health": 500, "power": 100},
	"money": 10000
}

4. /items/add (아이템 생성) -POST

{
	"itemName": "나뭇가지",
	"stats": 	  {"health": 20, "power": 5},
	"price": 		1000
}

5. /inv/:characterId/equip (아이템장착) -POST

{
	"itemId" : "2"
}

6. /shop/buy/:characterId (아이템 구입)

[
	{
		"item_code": "목검",
		"count": 		2
	},
	{
		"item_code": "철검",
		"count": 		1
	}
]