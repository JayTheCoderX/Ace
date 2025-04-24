const { subscribe } = require('node:diagnostics_channel');
const fs = require('node:fs');

const operators = [
  "!",
  "&",
  "?",
  "+",
  "*",
  "-",
  "%",
  "=",
  "^",
  "$",
  ">",
  "<",
  ",",
  ">>",
  "$=",
  ";",
  "\n",
  "+=",
  "\\",
  "/",
  "++",
  "+=",
  "-=",
  "/=",
  "==",
  "--"
]

const valid_namechars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const valid_numbers = '0123456789.'
const quotes = '`\'"'
const dummy_token = { type: 'nil', value: 'nil' }

//const parsed = parse("cheese=value*2+cheese(5,bungle),(functions,(more_functions, functions)),(test),(test)")

try {
  const data = fs.readFileSync('./examples/functions.ace', 'utf8');
  console.log(data);
  const parsed = parse(data);
  console.log("PrettyPrint INIT: " + JSON.stringify(parsed, null, 2))
  console.log(JSON.stringify(parsed, null, 2))
  console.log("===  EXECUTION  START  ===")
  const [code, state, output] = interpret(parsed, 0, {}, true, true)
  console.log("=== EXECUTION FINISHED ===")
  console.log("PrettyPrint code block state: " + JSON.stringify(code, null, 2))
  console.log("PrettyPrint global state: " + JSON.stringify(state, null, 2))
  42
} catch (err) {
  console.error(err);
}

function bracketMatch(bracket1, bracket2) {
  if (bracket1 == '{' && bracket2 == '}') {
    return true
  }
  if (bracket1 == '(' && bracket2 == ')') {
    return true
  }
  if (bracket1 == '[' && bracket2 == ']') {
    return true
  }
  console.log("Brackets Error!")
  console.log(bracket1)
  console.log(bracket2)
}

function parse(code) {
  code = code + " "
  let tokens = []
  let subString = ''
  let depth = 0
  let quote = false

  Array.from(code).forEach(chr => {
    if (depth > 0) {
      subString += chr
    } else {
      if (subString) {
        if (!bracketMatch(subString.charAt(0), subString.charAt(subString.length - 1))) {
          console.error("mismatched brackets in object" + subString)
          process.exit(-1)
        }
        if (subString.charAt(0) == "(") {
          tokens.push({ type: 'expression', value: parse(subString.slice(1, -1)) })
        }
        if (subString.charAt(0) == "{") {
          tokens.push({ type: 'block', value: parse(subString.slice(1, -1)) })
        }
        if (subString.charAt(0) == "[") {
          tokens.push({ type: 'static', value: parse(subString.slice(1, -1)) })
        }
        subString = ''
      }
    }
    if (quote) {
      context = tokens[tokens.length - 1]
      if (context.quote == chr) {
        console.log(context.value.charAt(context.value.length - 1))
        let offset = 0
        if (context.value.charAt(context.value.length - 1) == '\\') {
          offset = 1
          while (context.value.charAt(context.value.length - offset) == '\\') {
            offset++
          }
          offset--
        }
        if (offset % 2 === 0) {
          quote = false; tokens[tokens.length - 1].value = tokens[tokens.length - 1].value.replace("\\\\", "\\")
        } else { tokens[tokens.length - 1].value += chr }
      } else { tokens[tokens.length - 1].value += chr }
    } else {
      if ("({[".includes(chr)) {
        if (!depth) { subString += chr }
        depth += 1
      } else if (")}]".includes(chr)) {
        depth -= 1
      }
      if (operators.includes(chr) && !depth) {
        if (((tokens[tokens.length - 1] || dummy_token).type == 'operator') && operators.includes((tokens[tokens.length - 1] || dummy_token).value + chr)) {
          tokens[tokens.length - 1].value += chr
        } else {
          tokens.push({ type: 'operator', value: chr })
        }
      }
      if (valid_namechars.includes(chr) && !depth) {
        if ((tokens[tokens.length - 1] || dummy_token).type == 'object') {
          tokens[tokens.length - 1].value += chr
        } else {
          tokens.push({ type: 'object', value: chr })
        }
      }
      if (valid_numbers.includes(chr) && !depth) {
        if ((tokens[tokens.length - 1] || dummy_token).type == 'num') {
          tokens[tokens.length - 1].value += chr
          tokens[tokens.length - 1].value = tokens[tokens.length - 1].value
        } else {
          tokens.push({ type: 'num', value: chr })
        }
      }
      if (quotes.includes(chr) && !depth) {
        tokens.push({ type: 'string', value: "", quote: chr })
        quote = true
      }
    }
  }
  )
  return tokens.filter(x => !(x.value == ',' || x.value == ';' || x.value == '\n'))
}

function getType(code, pointer, state) {
  if ((code[pointer] || dummy_token).type) {
    if (code[pointer].type == object) {

    }
  }
}

function dcopy(object){
  const dcopyStructured = structuredClone(object);
  return dcopyStructured
}

function interpret(code, ptr, state, exec = false, traverse = true) {
  let pf = parseFloat
  //console.log("Traverse: " + traverse)
  //console.log("Execute: " + exec)
  //console.log("I'm getting some code here:")
  //console.log(JSON.stringify(code, null, 2))
  //console.log(ptr)
  let localState = state || {}
  let functions = false
  let tmp = null
  let pointer = pf(ptr)
  while (pointer < code.length) {
    functions = false
    // MARK: type handling
    if ((code[pointer] || dummy_token).type == "operator") {
      if (code[pointer].value == ">>") {
        [tmp, localState] = interpret(dcopy(code), pointer + 1, dcopy(localState), false, true)
        code = tmp
        console.log((code[pointer+1]||dummy_token).value)
        code.splice(pointer, 2)
      }
    }
    if (((code[pointer + 1] || dummy_token).type == "operator") && traverse) {
      [
        { match: { a: 'string', b: 'string' }, op: '+', traverse: true, exec: (a, b) => a + b, type: 'string' },
        { match: { a: 'num', b: 'string' }, op: '*', traverse: false, exec: (a, b) => b.repeat(pf(a)), type: 'string' },
        { match: { a: 'string', b: 'num' }, op: '*', traverse: false, exec: (a, b) => a.repeat(pf(b)), type: 'string' },
        { match: { a: 'num', b: 'string' }, op: '+', traverse: true, exec: (a, b) => a + b, type: 'string' },
        { match: { a: 'string', b: 'num' }, op: '+', traverse: true, exec: (a, b) => a + b, type: 'string' },
        { match: { a: 'num', b: 'num' }, 'op': '+', traverse: true, exec: (a, b) => pf(a) + pf(b), type: 'num' },
        { match: { a: 'num', b: 'num' }, 'op': '*', traverse: false, exec: (a, b) => pf(a) * pf(b), type: 'num' },
        { match: { a: 'num', b: 'num' }, 'op': '/', traverse: false, exec: (a, b) => pf(a) / pf(b), type: 'num' },
        { match: { a: 'num', b: 'num' }, 'op': '%', traverse: false, exec: (a, b) => pf(a) % pf(b), type: 'num' },
        { match: { a: 'num', b: 'num' }, 'op': '^', traverse: false, exec: (a, b) => pf(a) ^ pf(b), type: 'num' },
        { match: { a: 'num', b: 'num' }, 'op': '==', traverse: true, exec: (a, b) => (pf(a) == pf(b))?1:0, type: 'num' },
        { match: { a: 'num', b: 'num' }, 'op': '!=', traverse: true, exec: (a, b) => (pf(a) != pf(b))?1:0, type: 'num' },
        { match: { a: 'num', b: 'block'}, 'op': '*', traverse: false, exec: (a, b) => {i=0; while (i<=pf(a)) {
          let mb = b.map((z) => z);
          mb.splice(1, 0, {type:"operator", value:"="}, {type:"num", value:i});
          [tmp, localState] = interpret(mb, 0, dcopy(localState), true, true);
          i++
        }; return 1}, type: 'num' },
        //{ match: { a: 'static', b: 'block' }, 'op': '*', traverse: false, exec: (a, b) => a }
      ].some(func => {
        if (code[pointer].type == func.match.a && code[pointer + 1]) {
          if (code[pointer + 1].value == func.op) {
            if (traverse || ['expression', 'object'].includes(code[pointer + 2].type)) { [code, localState] = interpret(dcopy(code), pointer + 2, dcopy(localState), false, func.traverse) }
            //console.log(code[pointer].value)
            if ((code[pointer + 2] || dummy_token).type == func.match.b) {
              //console.log("evaluating " + code[pointer].value + ` ${func.op} ` + code[pointer + 2].value + " equals:")
              code.splice(pointer, 3, { type: func.type, value: func.exec(code[pointer].value, code[pointer + 2].value) })
              if (!code[pointer]) {//console.log("Warn! This returned nil, blanking value");
              code.splice(pointer,1,{type:"num", value:'0'})}
              functions = true
              //console.log(code[pointer].value)
              return true
            }
          }
        }
      })
    }
    if (!code[pointer]) {
      //console.log(code)
      //console.log(pointer)
      //console.log("%%%")
    }
    if ((code[pointer] || dummy_token).type == "object" && !functions) {
      if ((code[pointer + 1] || dummy_token).type == "operator") {
        if (code[pointer + 1].value == "=") {
          [tmp, localState] = interpret(dcopy(code), pointer + 2, dcopy(localState), false, true)
          code = tmp
          //console.log("setting " + code[pointer].value + " to " + JSON.stringify(code[pointer + 2], null, 2))
          localState[code[pointer].value] = code[pointer + 2]
          code.splice(pointer, 3)
          functions = true
        } else if (code[pointer + 1].value == "$=") {
          //console.log(code[pointer + 2])
          localState[code[pointer].value] = code[pointer + 2]
          code.splice(pointer, 3)
          functions = true
        }
      }
      if (!functions) {
        code.splice(pointer, 1, dcopy(localState)[code[pointer].value] || dummy_token)
        functions = true
      }
      // MARK: expressions
      40
      //if (['+='].includes(code[pointer + 1].value)) {}
    } else if ((code[pointer] || dummy_token).type == "expression" && !functions) {
      [tmp, localState] = interpret(dcopy(code)[pointer].value, 0, dcopy(localState), true, true)
      //console.log("Calling with:")
      //console.log(code[pointer].value)
      code[pointer] = tmp[0] || dummy_token
      functions = true
    } else if ((code[pointer] || dummy_token).type == "block" && false) {
      let [tmp, localState] = interpret({ ...code[pointer].value }, 0, localState, true, true)
      code[pointer] = tmp[0] || dummy_token
      functions = true
    }
    if (!functions) {
      if (exec) { pointer++ } else {
        //console.log('Function ended so returning '+JSON.stringify([code, localState, pointer], null, 2));
        return [code, localState, pointer]
      }
    }
  }
  return [code, localState, pointer]

}