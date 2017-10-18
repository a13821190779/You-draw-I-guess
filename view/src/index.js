console.log('rollup压缩html') // TODO
import mininotice from 'mininotice'
import 'mininotice/lib/notice.css'

import './style/reset.css'
import './style/index.scss'

import io from 'socket.io-client'

import Style from './js/style.js'
import Canvas from './js/canvas.js'

import Config from '../../config.js'

let conf
conf = ENV === 'development' ? Config.dev : Config.prod

window.addEventListener('load', (e) => {
	let userInfo
	const username = 'fox'
	const socket = io(conf.ip)
	const canvas = document.querySelector('canvas')
	const input = document.querySelector('input')
	const form = document.querySelector('form')
	const view = document.querySelector('.view')
	const msgs = view.querySelector('.msgs')
	const count = view.querySelector('.user span')
	const curplayer = document.querySelector('.curplayer')
	const start = document.querySelector('.start')
	const question = document.querySelector('.question')

	
	

	const showQuestion = (questionText) => {
		question.innerHTML = questionText.topic
		question.style.display = 'block'
		const timer = setTimeout(function() {
			clearTimeout(timer)
			question.style.display = 'none'
		}, 3000)
	}

	const myComments = (msg) => {
		const msgEl = document.createElement('p')
		msgEl.style.textAlign = 'right'
		msgEl.innerHTML = `你说: ${ msg }`
		msgs.appendChild(msgEl)
	}
	const submitComments = (msg, username) => {
		const msgEl = document.createElement('p')
		msgEl.innerHTML = `${ username }说: ${ msg }`
		msgs.appendChild(msgEl)
	}

	const userTips = (person, operate, room) => {
		const msgEl = document.createElement('p')
		msgEl.innerHTML = `${ person } ${ operate } ${ room }<br />`
		msgs.appendChild(msgEl)
	}

	const renderUser = (person, info) => {
		const html = `
		<div class="player" data-index="${ info.index }">
		<p class="title">玩家${ info.index + 1 }</p>
		<p class="state">${ info.state ? '准备' : '未准备' }</p>
		<p class="nick">${ person }</p>
		<p class="own">${ info.own ? '房主' : '' }</p>
		</div>
		`
		const temp = document.createElement('div')
		temp.innerHTML = html
		curplayer.appendChild(temp.children[0])
	}


	new Style(canvas, view, curplayer)
	const instance = new Canvas(canvas, socket)

	socket.on('updateClick', (data) => {
		instance.socketClick(data)
	})
	socket.on('updateMove', (data) => {
		instance.socketMove(data)
	})

	// 连接
	socket.on('connect', () => {
		socket.emit('setId', username)
		socket.emit('join', username)
	})

	// 设置当前用户ID
	socket.on('updateUserInfo', (curUserInfo) => {
		userInfo = curUserInfo
		userInfo.own && (start.style.display = 'block')
	})

	// 用户加入
	socket.on('someoneJoin', (users, name, room) => {
		curplayer.innerHTML = ''
		count.innerHTML = users.length
		users.forEach((el, index) => {
			if (el.id === userInfo.id) {
				renderUser('我', el)
			} else {
				renderUser(el.name, el)
			}
		})

		userTips(name, '加入了', room)
	})

	// 用户离开
	socket.on('someoneLeave', (name, users, room) => {
		// 当有用户退出则取消游戏
		instance.canStart = false
		curplayer.innerHTML = ''
		count.innerHTML = users.length

		users.forEach((el, index) => {
			if (el.id === userInfo.id) {
				el.own && (start.style.display = 'block')
				userInfo.index = el.index
				renderUser('我', el)
			} else {
				renderUser(el.name, el)
			}
		})
		userTips(name, '离开了', room)
	})

	// 显示聊天内容
	socket.on('showMsg', submitComments)

	// 发送
	form.onsubmit = (e) => {
		const ev = e || window.event
		ev.preventDefault()
		myComments(input.value)
		socket.send(input.value, username)
		input.value = ''
	}

	// 准备状态部分
	curplayer.addEventListener('click', function(e) {
		const ev = e || window.event
		if (ev.target.classList.contains('player') && +ev.target.dataset.index === userInfo.index) {

			socket.emit('toggleState', ev.target.dataset.index)
		}
	})

	socket.on('changeState', (users) => {
		curplayer.innerHTML = ''
		users.forEach((el, index) => {
			if (el.id === userInfo.id) {
				renderUser('我', el)
			} else {
				renderUser(el.name, el)
			}
		})
	})

	// 开始游戏
	start.addEventListener('click', function(e) {
		socket.emit('startGame')
	})

	socket.on('start', (curDraw, question) => {
		mininotice.msg('游戏开始')
		instance.clearCanvas()
		if (userInfo.index === curDraw) {
			instance.canDraw = false
			showQuestion(question)
		}
		instance.canStart = true
	})

	socket.on('gameEnd', () => {
		mininotice.msg('游戏结束')
		instance.clearCanvas()
		instance.canDraw = true
		instance.canStart = false
	})

	// 轮询当前用户，一次作画
	socket.on('changeDrawer', (curDraw, question) => {
		instance.clearCanvas()
		if (userInfo.index === curDraw) {
			instance.canDraw = false
			showQuestion(question)
		} else {
			instance.canDraw = true
		}
	})

	socket.on('notPrepared', () => {
		console.log('所有玩家准备后才能开始游戏')
	})

	// 回答正确
	socket.on('anwser', (un) => {
		// 进入下一次轮询
		mininotice.msg(`${ un }回答正确`)
	})
})
