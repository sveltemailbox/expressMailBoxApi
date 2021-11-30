//Mail Action constants
module.exports = {
  UNREAD: '0',
  READ: '1',
  CRASHED: '2',
  IS_STARRED: '3',
  STARRED_CRASHED: '4',
  READ_CRASHED: '5',
  UNREAD_CRASHED: '6',
  STARRED_UNREAD: '7',
  STARRED_READ: '8',
  //new codes ....
  Crashed_Unread:'99',
	Crashed_Read:'98',
	Crashed_Starred_Unread:'97',
	Crashed_Starred_Read:'96',
  Crashed:'95',
  Composed_Unread:'89',
	Composed_Read:'88',
	Composed_Starred_Read:'87',
	Composed_Starred_Unread:'86',
  Starred_Unread:'79',
	Starred_Read:'78',
  Starred:'77',
  Unread:'69',
	Read:'68',
	Sent:'67',
}

module.exports.fromAction =['67','79','86','89','97','99'];
module.exports.unread = ['69','79','86','89','97','99'];
module.exports.starred = ['77','78','79','86','87','96','97'];
module.exports.crashed = ['95','96','97','98','99'];
module.exports.archives = ['98','96','87','88','78','68'];
module.exports.COMPOSED = ['89','88','87','86'];
