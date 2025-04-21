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
  ">",
  "<",
  ",",
  ";",
  "\n",
  "+=",
  "\\",
  "/",
  "++",
  "+=",
  "-=",
  "/=",
  "--"
]

const valid_namechars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const valid_numbers = '0123456789.'
const quotes = '`\'"'
const dummy_token = { type: 'nil', value: 'nil' }

//const parsed = parse("cheese=value*2+cheese(5,bungle),(functions,(more_functions, functions)),(test),(test)")

try {
  const data = fs.readFileSync('./examples/objects.ace', 'utf8');
  console.log(data);
  const parsed = parse(data);
  console.log("PrettyPrint INIT: " + JSON.stringify(parsed, null, 2))
  console.log(JSON.stringify(parsed, null, 2))
  const [code, state, output] = interpret(parsed, 0, {}, exec = true)
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
        depth += 1
        subString += chr
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

function interpret(code, pointer, state, exec = false) {
  console.log("PrettyPrint State: " + JSON.stringify(code, null, 2))
  console.log(pointer)
  let localState = {}
  let functions = false
  while (pointer < code.length) {
    functions = false
    // MARK: type handling
    if (code[pointer].type == "string") {
      if ((code[pointer + 1] || dummy_token).type == "operator") {
        console.log("String has operator:")
        console.log(code[pointer + 1] || dummy_token.type)
        if (code[pointer + 1].value == '+') {
          [code] = interpret(code, pointer + 2)
          console.log(code[pointer].value)
          if ((code[pointer + 2] || dummy_token).type == 'string') {
            code.splice(pointer, 3, { type: 'string', value: code[pointer].value + code[pointer + 2].value })
            functions = true
            console.log(code)
          }
        }
      }
    } else if (code[pointer].type == "object") {
      if ((code[pointer + 1] || dummy_token).type == "operator") {
        if (code[pointer + 1].value == "=") {
          let [tmp] = interpret(code, pointer + 2)
          code = tmp
          localState[code[pointer].value] = code[pointer+2]
          code.splice(pointer, 3)
        }
      }
    // MARK: expressions
      //if (['+='].includes(code[pointer + 1].value)) {}
    } else if (code[pointer].type == "expression") {
      let [tmp] = interpret(code[pointer].value, 0, exec = true)
      code[pointer] = tmp[0] || dummy_token
    }
    if (!functions) {
      if (exec) { pointer++ } else { return [code, localState, pointer] }
    }
  }
  return [code, localState, pointer]

}