import re
def prereqModule(input):
	#this method needs more tweaking to handle more complex situation
	#Possible improvement might be the use of a third party natural language processing library.
	module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
	prereqModuleList = module_regex.findall(input)
	result = []
	mods = []
	for value in prereqModuleList:
		if value.lower() == "and" or value.lower() == "&":
			result.append(mods)
			mods = []
		else:	
			mods.append(value)
	return result
			
def precludeModule(input):
	module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b", re.IGNORECASE)
	precludeModuleList = module_regex.findall(input)
	return precludeModuleList