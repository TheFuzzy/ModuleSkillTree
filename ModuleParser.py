import re
def prereqModule(module, input, faculty):
	#this method needs more tweaking to handle more complex situation
	#Possible improvement might be the use of a third party natural language processing library.
	result = []
	mods = []
				
	if faculty == "ARTS & SOCIAL SCIENCES":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)
		

	elif faculty == "DENTISTRY":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "ENGINEERING":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "JOINT MULTI-DISCIPLINARY PROGRAMMES":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "LAW":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "NON-FACULTY-BASED DEPARTMENTS":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "SCHOOL OF BUSINESS":
		modInput = re.split('Co-requisite', input , re.IGNORECASE)[0]
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|\band\b|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(modInput)
		
		for value in prereqModuleList:
			if value.lower() == "and" or value == "&":
				result.append(mods)
				mods = []
			elif value.lower() != module.lower():	
				mods.append(value)
		result.append(mods)
		
	elif faculty == "SCHOOL OF COMPUTING":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "SCHOOL OF DESIGN AND ENVIRONMENT":
		string_regex = re.compile(r";|&|,", re.IGNORECASE)
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|;|&|,", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)
		
		if string_regex.search(input) is not None :
			for value in prereqModuleList:
				if value == ";" or value == "&" or value == ",":
					result.append(mods)
					mods = []
				elif value.lower() != module.lower():	
					mods.append(value)
					
				result.append(mods)
		else :
			for value in prereqModuleList:		
				if value.lower() != module.lower():
					mods = []
					mods.append(value)
					result.append(mods)
		
	elif faculty == "SCIENCE":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "UNIVERSITY ADMINISTRATION":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "UNIVERSITY SCHOLARS PROGRAMME":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "YONG LOO LIN SCHOOL OF MEDICINE":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	elif faculty == "YONG SIEW TOH CONSERVATORY OF MUSIC":
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)

	else :
		module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b|and|&", re.IGNORECASE)
		prereqModuleList = module_regex.findall(input)
		for value in prereqModuleList:
			if value.lower() == "and" or value == "&":
				result.append(mods)
				mods = []
			else:	
				mods.append(value)
	
	for item in result:
		if len(item) == 0:
			result.pop(result.index(item))
	
	return result
			
def precludeModule(module, input):
	module_regex = re.compile(r"\b[a-zA-Z]{2,3}[0-9]{4,4}[a-zA-Z]?\b", re.IGNORECASE)
	precludeModuleList = module_regex.findall(input)
	result = []
	for item in precludeModuleList:
		if item == module:
			precludeModuleList.pop(precludeModuleList.index(item))
	
	result.append(precludeModuleList)
	return result