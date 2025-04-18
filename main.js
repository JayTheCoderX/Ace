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
].join('')

const valid_namechars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const valid_numbers = '0123456789.'
const quotes = '`\'"'
const dummy_token = { type: 'nil', value: 'nil' }

//const parsed = parse("cheese=value*2+cheese(5,bungle),(functions,(more_functions, functions)),(test),(test)")

try {
  const data = fs.readFileSync('./examples/syntaxtest.ace', 'utf8');
  console.log(data);
  const parsed = parse(data);
  console.log(JSON.stringify(parsed, null, 2))
  const [code, state, output] = interpret(parsed, 0, {}, exec=true)
  console.log("=== EXECUTION FINISHED ===")
  console.log("PrettyPrint State: " + JSON.stringify(code, null, 2))
} catch (err) {
  console.error(err);
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
        tokens.push({ type: 'nested_expression', value: parse(subString.slice(0, -1)) });
        //console.log(subString.slice(0,-1))
        subString = ''
      }
    }
    if (quote) {
      context = tokens[tokens.length - 1]
      if (context.quote == chr) {
        console.log(context.value.charAt(context.value.length - 1))
        offset = 0
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
      } else if (")}]".includes(chr)) {
        depth -= 1
      }
      if (operators.includes(chr)) {
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
  let localState = {}
  let functions = false
  while (pointer < code.length) {
    functions = false
    if (code[pointer].type == "string") {
      if ((code[pointer + 1] || dummy_token).type == "operator") {
        console.log("String has operator:")
        console.log(code[pointer + 1] || dummy_token.type)
        if (code[pointer + 1].value == '+') {
          console.log(code[pointer].value)
          if (code[pointer + 2].type == 'string') {
            code.splice(pointer,3,{type: 'string', value:code[pointer].value+code[pointer+2].value})
            functions = true
            console.log(code)
            if (!exec) {console.log('ERROR');return [code,pointer,state]}
          }
        }
      }
    } else if (code[pointer].type == "object") {
      if ("+".includes(code[pointer + 1].value)) {}
    }
    if (!functions) {
      pointer++
    }
    console.log("PrettyPrint State: " + JSON.stringify(code, null, 2))
    console.log(pointer)
  }
  return [code, state, pointer]
  
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