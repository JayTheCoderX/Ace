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
  const data = fs.readFileSync('./examples/syntaxtest.ace', 'utf8');
  console.log(data);
  const parsed = parse(data);
  console.log("PrettyPrint INIT: " + JSON.stringify(parsed, null, 2))
  console.log(JSON.stringify(parsed, null, 2))
  const [code, state, output] = interpret(parsed, 0, {}, exec = true)
  console.log("=== EXECUTION FINISHED ===")
  console.log("PrettyPrint code block state: " + JSON.stringify(code, null, 2))
  console.log("PrettyPrint global state: " + JSON.stringify(state, null, 2))
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
        //console.log(subString.slice(0,-1))
        subString = ''
      }
    }
    if (quote) {
      context = tokens[tokens.length - 1]
      if (context.quote == chr) {
        console.log(context.value.charAt(context.value.length - 1))
        let offset = 0
        if (context.value.charAt(context.value.length - 1) == '\\') {
          console.log("WHEEE")
          offset = 1
          while (context.value.charAt(context.value.length - offset) == '\\') {
            offset++
          }
          offset--
          console.log(offset)
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
        console.log(chr)
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
    if (code[pointer].type == "string") {
      if ((code[pointer + 1] || dummy_token).type == "operator") {
        console.log("String has operator:")
        console.log(code[pointer + 1] || dummy_token.type)
        if (code[pointer + 1].value == '+') {
          console.log("Branching from " + JSON.stringify(code[pointer + 2], null, 2))
          [code] = interpret(code, pointer + 2)
          console.log(code[pointer].value)
          if (code[pointer + 2].type == 'string') {
            code.splice(pointer, 3, { type: 'string', value: code[pointer].value + code[pointer + 2].value })
            functions = true
            console.log(code)
          }
        }
      }
    } else if (code[pointer].type == "object") {
      if ((code[pointer + 1] || dummy_token).type == "operator") {
        if (code[pointer + 1].value == "=") {
          localState[code[pointer].value] = code[pointer + 2]
          console.log("Applying value to state")
          console.log(localState)
        }
      }
      //if (['+='].includes(code[pointer + 1].value)) {}
    } else if (code[pointer].type == "expression") {
      let [tmp] = interpret(code[pointer].value)
      //code[pointer] = tmp[-1]
      //if (['+='].includes(code[pointer + 1].value)) {}
    }
    if (!functions) {
      if (exec) { pointer++ } else { return [code, localState, pointer] }
    }

  }
  return [code, localState, pointer]

}

function getValue(code, state, pointer, offset, expectedTypes) {

}

function evaluate(code, state) {
  let localState = {}
  let pointer = 0
  if (code.length == 1) {
    return code[0]
  } else if (code.length > 1) {
    while (pointer < code.length) {
      token = code[pointer]
      switch (token.type) {
        case "operator":
          if (token.value === "=") {
            if (code[pointer - 1].type === "object") {
              (localState[code[pointer - 1].value]) = getValue(code, state, pointer)
            }
          }
          pointer++
          break
        default:
          pointer++
      }
    }
  } else {
    // hmmm
  }
  return localState
}